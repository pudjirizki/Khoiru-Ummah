import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, limit as fbLimit, startAfter, QueryDocumentSnapshot, Timestamp, where, getDocs } from 'firebase/firestore';
// firebase
import { fbFirestore } from '/src/firebase';
// interfaces
import { PayloadCreateCriteriaInterface } from '/src/interfaces/criteria';
import { PayloadCreateQuestionInterface } from '/src/interfaces/question';
import { FormInterface, PayloadCreateFormInterface } from '/src/interfaces/form';
import { FinalFormInterface, FinalFormsParamsInterface, PayloadCreateCriteriasFinalFormInterface, PayloadCreateFinalFormInterface } from '/src/interfaces/final-form';
// hooks
import { useDatabaseForm } from '/src/hooks/use-database-form';
import { useDatabaseCriteria } from '/src/hooks/use-database-criteria';
import { useDatabaseQuestion } from '/src/hooks/use-database-question';

// ----------------------------------------------------------------------

export interface UseFinalFormInterface {
  finalFormsList: FormInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  finalForms: (params?: FinalFormsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getFinalFormById: (id: string) => FormInterface | null;
  fetchFinalFormById: (id: string) => Promise<FinalFormInterface | null>;
  // raw
  allFinalFormsCache: FormInterface[];
  //
  createFinalForm: (payload: PayloadCreateFinalFormInterface) => Promise<FormInterface | null>;
  updateFinalForm: (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>, currentFinalForm: FinalFormInterface) => Promise<FormInterface | null>;
  deleteFinalForm: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapForm = (data: any): FormInterface => ({
  id: data.id,
  createdBy: data.createdBy,
  title: data.title,
  class: data.class,
  description: data.description,
  notes: data.notes,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

const alphabet = Array.from(Array(26)).map((_, i) => String.fromCharCode(i + 97));

// ----------------------------------------------------------------------

export const useFinalForm = (): UseFinalFormInterface => {
  const [allFinalFormsCache, setAllFinalFormsCache] = useState<FormInterface[]>([]);

  const [finalFormsList, setFinalFormsList] = useState<FormInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<FinalFormsParamsInterface>({ class: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const { createForm, allFormsCache: formsCacheFromHook, deleteForm, fetchFormById, updateForm, getFormById } = useDatabaseForm();

  const { createCriteria, allCriteriasCache, deleteCriteria, updateCriteria } = useDatabaseCriteria();

  const { createQuestion, allQuestionsCache, deleteQuestion, updateQuestion } = useDatabaseQuestion();

  // sync
  useEffect(() => {
    if (Array.isArray(formsCacheFromHook)) {
      setAllFinalFormsCache(formsCacheFromHook);
    }
  }, [formsCacheFromHook]);

  // ALL FORM CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'forms'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: FormInterface[] = [];
        snap.forEach((d) => arr.push(mapForm({ id: d.id, ...d.data() })));
        setAllFinalFormsCache(arr);
      },
      (err) => {
        console.error('allFinalFormsCache snapshot error', err);
        setAllFinalFormsCache([]);
      }
    );

    return () => {
      unsub();
      setAllFinalFormsCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { class: classFilter } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'forms');
    const qParts: any[] = [];

    if (classFilter) qParts.push(where('class', '==', classFilter));

    qParts.push(orderBy('createdAt', 'desc'));

    if (pageIndex > 1) {
      const cursor = cursorsRef.current[pageIndex - 1] ?? null;
      if (cursor) {
        qParts.push(startAfter(cursor));
      }
    }

    qParts.push(fbLimit(pageSize));

    return query(collectionRef, ...qParts);
  }, []);

  const subscribePage = useCallback(
    (pageIndex: number) => {
      const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
      if (pageIndex < 1 || pageIndex > max) return;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setIsLoading(true);
      const q = buildQueryForPage(pageIndex);

      const unsub = onSnapshot(
        q,
        (snap) => {
          const list: FormInterface[] = [];
          snap.forEach((d) => {
            list.push(mapForm({ id: d.id, ...d.data() }));
          });

          setFinalFormsList(list);
          setIsLoading(false);

          const last = snap.docs[snap.docs.length - 1] ?? null;
          lastVisibleRef.current = last || null;
          cursorsRef.current[pageIndex] = last || null;
        },
        (err) => {
          console.error('paginate snapshot error', err.code, err.message);
          setIsLoading(false);
        }
      );

      unsubscribeRef.current = unsub;
      setPage(pageIndex);
    },
    [buildQueryForPage]
  );

  const finalForms = useCallback(
    (params?: FinalFormsParamsInterface) => {
      const classFilter = params?.class ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { class: classFilter, limit, perPage };
      limitRef.current = limit;
      perPageRef.current = perPage;

      cursorsRef.current = [null];
      lastVisibleRef.current = null;

      subscribePage(1);
    },
    [subscribePage]
  );

  const nextPage = useCallback(() => {
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
    if (page >= max) return;
    subscribePage(page + 1);
  }, [page, subscribePage]);

  const prevPage = useCallback(() => {
    if (page <= 1) return;
    subscribePage(page - 1);
  }, [page, subscribePage]);

  const resetPagination = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    cursorsRef.current = [null];
    lastVisibleRef.current = null;
    setFinalFormsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
  const getFinalFormById = useCallback(
    (id: string): FormInterface | null => {
      if (!id) return null;
      return getFormById ? getFormById(id) : (allFinalFormsCache.find((u) => u.id === id) ?? null);
    },
    [allFinalFormsCache, getFormById]
  );

  // FORMAT TIME
  const formatTimestamp = (value: any): string => {
    const date = value && typeof value.toDate === 'function' ? value.toDate() : value instanceof Date ? value : new Date(value);
    const datePart = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' } as any);
    const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Jakarta' } as any);
    return `${datePart} at ${timePart} UTC+7`;
  };

  // FETCH FINAL FORM
  const fetchFinalFormById = useCallback(
    async (id: string): Promise<FinalFormInterface | null> => {
      if (!id) return null;

      try {
        const form = await fetchFormById(id);
        if (!form?.id) return null;

        const criteriaSnap = await getDocs(query(collection(fbFirestore, 'criterias'), where('formId', '==', id)));
        const criteriasRaw = criteriaSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

        const criteriasWithQuestions = await Promise.all(
          criteriasRaw.map(async (c) => {
            const qSnap = await getDocs(query(collection(fbFirestore, 'questions'), where('criteriaId', '==', c.id)));
            const questionsRaw = qSnap.docs.map((qD) => ({ id: qD.id, ...(qD.data() as any) }));

            const questionsSorted = questionsRaw
              .slice()
              .sort((a: any, b: any) => {
                if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
                const aa = a.createdAt && typeof a.createdAt.toDate === 'function' ? a.createdAt.toDate().getTime() : new Date(a.createdAt ?? 0).getTime();
                const bb = b.createdAt && typeof b.createdAt.toDate === 'function' ? b.createdAt.toDate().getTime() : new Date(b.createdAt ?? 0).getTime();
                return aa - bb;
              })
              .map((q: any, i: number) => ({
                ...q,
                order: i + 1,
                createdAt: formatTimestamp(q.createdAt),
                updatedAt: formatTimestamp(q.updatedAt),
              }));

            return {
              ...c,
              questions: questionsSorted,
              createdAt: formatTimestamp(c.createdAt),
              updatedAt: formatTimestamp(c.updatedAt),
            };
          })
        );

        // SORT CRITERIAS BY TITLE
        const criteriasSortedByTitle = criteriasWithQuestions.slice().sort((a: any, b: any) => String(a.title ?? '').localeCompare(String(b.title ?? ''), 'en', { sensitivity: 'base' }));

        return {
          ...form,
          createdAt: formatTimestamp((form as any).createdAt),
          updatedAt: formatTimestamp((form as any).updatedAt),
          criterias: criteriasSortedByTitle,
        };
      } catch (error) {
        console.error('fetchFinalFormById error:', error);
        return null;
      }
    },
    [fetchFormById]
  );

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CREATE FINAL FORM
  const createFinalForm = useCallback(
    async (payload: PayloadCreateFinalFormInterface) => {
      try {
        const { criterias = [], ...formPayload } = payload;

        const resForm = await createForm(formPayload as PayloadCreateFormInterface);
        const formId = (resForm && (resForm as any).id) ?? (typeof resForm === 'string' ? resForm : '');

        await Promise.all(
          criterias.map(async (c: PayloadCreateCriteriasFinalFormInterface, idx: number) => {
            const { questions = [], ...criteriaPayload } = c;

            const createdCriteria = await createCriteria({
              ...criteriaPayload,
              title: criteriaPayload.title ?? alphabet?.[idx] ?? `g${idx + 1}`,
              formId,
            } as PayloadCreateCriteriaInterface);

            const criteriaId = (createdCriteria && (createdCriteria as any).id) ?? (typeof createdCriteria === 'string' ? createdCriteria : '');

            if (Array.isArray(questions) && questions.length > 0 && criteriaId) {
              await Promise.all(
                questions.map((q, qIdx) =>
                  createQuestion({
                    ...q,
                    order: q.order ?? qIdx + 1,
                    criteriaId,
                  } as PayloadCreateQuestionInterface)
                )
              );
            }
          })
        );

        return await fetchFormById(formId);
      } catch (error) {
        throw safeWrapError(error);
      }
    },
    [createForm, createCriteria, createQuestion, fetchFormById]
  );

  // UPDATE FINAL FORM
  const updateFinalForm = useCallback(
    async (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>, currentFinalForm?: FinalFormInterface) => {
      if (!id) return null;

      try {
        const { criterias: payloadCriterias, ...restFormFields } = payload as any;

        if (currentFinalForm) {
          const formUpdatePayload: Record<string, any> = {};
          for (const k of Object.keys(restFormFields)) {
            const newVal = restFormFields[k];
            const oldVal = (currentFinalForm as any)[k];
            const changed = typeof newVal === 'object' ? JSON.stringify(newVal) !== JSON.stringify(oldVal) : newVal !== oldVal;
            if (newVal !== undefined && changed) formUpdatePayload[k] = newVal;
          }
          if (Object.keys(formUpdatePayload).length > 0) {
            await updateForm(id, formUpdatePayload);
          }
        } else {
          if (Object.keys(restFormFields).length > 0) await updateForm(id, restFormFields);
        }

        if (!Array.isArray(payloadCriterias)) {
          return await fetchFormById(id);
        }

        for (const [cIdx, pc] of payloadCriterias.entries()) {
          const { id: payloadCritId, questions: payloadQuestions = [], ...criteriaFields } = pc as any;

          // CASE A: update existing criteria
          if (payloadCritId) {
            const critUpdate: Record<string, any> = {};
            for (const k of Object.keys(criteriaFields)) {
              const v = criteriaFields[k];
              if (v !== undefined) critUpdate[k] = v;
            }
            if (Object.keys(critUpdate).length > 0) {
              await updateCriteria(payloadCritId, critUpdate);
            }

            if (Array.isArray(payloadQuestions) && payloadQuestions.length > 0) {
              await Promise.all(
                payloadQuestions.map(async (pq: any, qIdx: number) => {
                  const { id: payloadQId, order: pqOrder, ...qFields } = pq;
                  const order = pqOrder ?? qIdx + 1;

                  if (payloadQId) {
                    const qUpdate: Record<string, any> = {};
                    if (qFields.text !== undefined) qUpdate.text = qFields.text;
                    if (order !== undefined) qUpdate.order = order;
                    for (const k of Object.keys(qFields)) {
                      if (k === 'text') continue;
                      const vv = qFields[k];
                      if (vv !== undefined) qUpdate[k] = vv;
                    }
                    if (Object.keys(qUpdate).length > 0) {
                      await updateQuestion(payloadQId, qUpdate);
                    }
                  } else {
                    // create question for this existing criteria
                    await createQuestion({
                      ...qFields,
                      order,
                      criteriaId: payloadCritId,
                    } as PayloadCreateQuestionInterface);
                  }
                })
              );
            }
            continue;
          }

          // CASE B: create new criteria + questions
          const createdCrit = await createCriteria({
            ...criteriaFields,
            title: criteriaFields.title ?? alphabet?.[cIdx] ?? `g${cIdx + 1}`,
            formId: id,
          } as PayloadCreateCriteriaInterface);

          const createdCritId = (createdCrit && (createdCrit as any).id) ?? (typeof createdCrit === 'string' ? createdCrit : '');

          if (!createdCritId) continue;

          if (Array.isArray(payloadQuestions) && payloadQuestions.length > 0) {
            await Promise.all(
              payloadQuestions.map((pq: any, qIdx: number) =>
                createQuestion({
                  ...pq,
                  order: pq.order ?? qIdx + 1,
                  criteriaId: createdCritId,
                } as PayloadCreateQuestionInterface)
              )
            );
          }
        }

        const updated = await fetchFormById(id);

        if (updated) {
          try {
            setAllFinalFormsCache((prev: any[]) => prev.map((u) => (u.id === updated.id ? updated : u)));
            setFinalFormsList((prev: any[]) => prev.map((u) => (u.id === updated.id ? updated : u)));
            // eslint-disable-next-line no-empty
          } catch (e) {}
        }

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [updateForm, fetchFormById, createCriteria, updateCriteria, createQuestion, updateQuestion, setAllFinalFormsCache, setFinalFormsList]
  );

  // DELETE FINAL FORM
  const deleteFinalForm = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;
      try {
        const existingCriterias = (allCriteriasCache || []).filter((c: any) => c.formId === id);

        await Promise.all(
          existingCriterias.map(async (c: any) => {
            const questionsForC = (allQuestionsCache || []).filter((q: any) => q.criteriaId === c.id);
            await Promise.all(questionsForC.map((q: any) => deleteQuestion(q.id)));
            await deleteCriteria(c.id);
          })
        );

        await deleteForm(id);

        setAllFinalFormsCache((prev) => prev.filter((u) => u.id !== id));
        setFinalFormsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [allCriteriasCache, allQuestionsCache, deleteQuestion, deleteCriteria, deleteForm]
  );

  // CLEANUP ON UNMONT
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, []);

  const hasNext = page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
  const hasPrev = page > 1;

  return {
    finalFormsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    finalForms,
    nextPage,
    prevPage,
    resetPagination,
    getFinalFormById,
    fetchFinalFormById,
    createFinalForm,
    updateFinalForm,
    deleteFinalForm,
    allFinalFormsCache,
  };
};
