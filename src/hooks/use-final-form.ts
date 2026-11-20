import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/lib/supabase';
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
  updateFinalForm: (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>, currentFinalForm?: FinalFormInterface) => Promise<FormInterface | null>;
  deleteFinalForm: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapForm = (data: any): FormInterface => ({
  id: data.id,
  createdBy: data.created_by ?? data.createdBy,
  title: data.title,
  class: data.class,
  description: data.description,
  notes: data.notes,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
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
  const paramsRef = useRef<FinalFormsParamsInterface>({ class: '', limit: 50, perPage: 5 });

  const { createForm, allFormsCache: formsCacheFromHook, deleteForm, fetchFormById, updateForm, getFormById } = useDatabaseForm();
  const { createCriteria, allCriteriasCache, deleteCriteria, updateCriteria } = useDatabaseCriteria();
  const { createQuestion, allQuestionsCache, deleteQuestion, updateQuestion } = useDatabaseQuestion();

  // sync cache from useDatabaseForm
  useEffect(() => {
    if (Array.isArray(formsCacheFromHook)) {
      setAllFinalFormsCache(formsCacheFromHook);
    }
  }, [formsCacheFromHook]);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);
    try {
      const { class: classFilter } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('forms').select('*').order('created_at', { ascending: false });

      if (classFilter) {
        q = q.contains('class', [classFilter]);
      }

      q = q.range(from, to);

      const { data } = await q;
      setFinalFormsList((data ?? []).map(mapForm));
    } finally {
      setIsLoading(false);
    }
    setPage(pageIndex);
  }, []);

  const finalForms = useCallback(
    (params?: FinalFormsParamsInterface) => {
      paramsRef.current = {
        class: params?.class ?? '',
        limit: params?.limit ?? 50,
        perPage: params?.perPage ?? 5,
      };
      limitRef.current = params?.limit ?? 50;
      perPageRef.current = params?.perPage ?? 5;
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
    const date = value instanceof Date ? value : new Date(value);
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

        const { data: criteriasData } = await supabase
          .from('criterias')
          .select('*')
          .eq('form_id', id);

        const criteriasRaw = (criteriasData ?? []).map((d) => ({
          id: d.id,
          formId: d.form_id ?? d.formId,
          title: d.title,
          description: d.description,
          weight: d.weight,
          createdAt: d.created_at ?? d.createdAt,
          updatedAt: d.updated_at ?? d.updatedAt,
        }));

        const criteriasWithQuestions = await Promise.all(
          criteriasRaw.map(async (c) => {
            const { data: questionsData } = await supabase
              .from('questions')
              .select('*')
              .eq('criteria_id', c.id);

            const questionsRaw = (questionsData ?? []).map((qD) => ({
              id: qD.id,
              criteriaId: qD.criteria_id ?? qD.criteriaId,
              order: qD.order,
              text: qD.text,
              createdAt: qD.created_at ?? qD.createdAt,
              updatedAt: qD.updated_at ?? qD.updatedAt,
            }));

            const questionsSorted = questionsRaw
              .slice()
              .sort((a: any, b: any) => {
                if (typeof a.order === 'number' && typeof b.order === 'number') return a.order - b.order;
                const aa = new Date(a.createdAt ?? 0).getTime();
                const bb = new Date(b.createdAt ?? 0).getTime();
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
          } catch (e) {}
        }

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [updateForm, fetchFormById, createCriteria, updateCriteria, createQuestion, updateQuestion]
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

  return {
    finalFormsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext: page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasPrev: page > 1,
    finalForms,
    nextPage,
    prevPage,
    resetPagination,
    getFinalFormById,
    fetchFinalFormById,
    allFinalFormsCache,
    createFinalForm,
    updateFinalForm,
    deleteFinalForm,
  };
};
