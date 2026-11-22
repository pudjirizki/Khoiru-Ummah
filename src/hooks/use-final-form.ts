import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/supabase';
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
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  finalForms: (params?: FinalFormsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getFinalFormById: (id: string) => FormInterface | null;
  fetchFinalFormById: (id: string) => Promise<FinalFormInterface | null>;
  allFinalFormsCache: FormInterface[];
  createFinalForm: (payload: PayloadCreateFinalFormInterface) => Promise<FormInterface | null>;
  updateFinalForm: (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>, currentFinalForm: FinalFormInterface) => Promise<FormInterface | null>;
  deleteFinalForm: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapForm = (data: any): FormInterface => ({
  id: data.id,
  createdBy: data.created_by ?? data.createdBy,
  title: data.title,
  class: data.class ?? [],
  description: data.description,
  notes: data.notes,
  createdAt: data.created_at ? new Date(data.created_at) : new Date(),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
});

const alphabet = Array.from(Array(26)).map((_, i) => String.fromCharCode(i + 97));

// ----------------------------------------------------------------------

export const useFinalForm = (): UseFinalFormInterface => {
  const [allFinalFormsCache, setAllFinalFormsCache] = useState<FormInterface[]>([]);
  const [finalFormsList, setFinalFormsList] = useState<FormInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<FinalFormsParamsInterface>({ class: '', limit: 50, perPage: 5 });

  const { createForm, allFormsCache: formsCacheFromHook, deleteForm, fetchFormById, updateForm, getFormById } = useDatabaseForm();
  const { createCriteria, allCriteriasCache, deleteCriteria, updateCriteria } = useDatabaseCriteria();
  const { createQuestion, allQuestionsCache, deleteQuestion, updateQuestion } = useDatabaseQuestion();

  // sync from hook
  useEffect(() => {
    if (Array.isArray(formsCacheFromHook)) {
      setAllFinalFormsCache(formsCacheFromHook);
    }
  }, [formsCacheFromHook]);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);

    try {
      const { class: classFilter } = paramsRef.current;
      const pageSize = perPageRef.current;
      const from = (pageIndex - 1) * pageSize;
      const to = from + pageSize - 1;

      let q = supabase.from('forms').select('*', { count: 'exact' });

      if (classFilter) {
        q = q.contains('class', [classFilter]);
      }

      q = q.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await q;

      if (error) {
        console.error('paginate fetch error', error.code, error.message);
        setIsLoading(false);
        return;
      }

      const list = (data ?? []).map(mapForm);
      setFinalFormsList(list);
      if (count !== null) setTotalCount(count);
      setPage(pageIndex);
    } catch (err) {
      console.error('paginate snapshot error', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const finalForms = useCallback(
    (params?: FinalFormsParamsInterface) => {
      const classFilter = params?.class ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { class: classFilter, limit, perPage };
      limitRef.current = limit;
      perPageRef.current = perPage;

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

  const getFinalFormById = useCallback(
    (id: string): FormInterface | null => {
      if (!id) return null;
      return getFormById ? getFormById(id) : (allFinalFormsCache.find((u) => u.id === id) ?? null);
    },
    [allFinalFormsCache, getFormById]
  );

  const formatTimestamp = (value: any): string => {
    const date = value instanceof Date ? value : new Date(value);
    const datePart = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' } as any);
    const timePart = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, timeZone: 'Asia/Jakarta' } as any);
    return `${datePart} at ${timePart} UTC+7`;
  };

  const fetchFinalFormById = useCallback(
    async (id: string): Promise<FinalFormInterface | null> => {
      if (!id) return null;

      try {
        const form = await fetchFormById(id);
        if (!form?.id) return null;

        const { data: criteriasRaw, error: critErr } = await supabase
          .from('criterias')
          .select('*')
          .eq('form_id', id);

        if (critErr) throw critErr;

        const criteriasWithQuestions = await Promise.all(
          (criteriasRaw ?? []).map(async (c: any) => {
            const { data: questionsRaw, error: qErr } = await supabase
              .from('questions')
              .select('*')
              .eq('criteria_id', c.id)
              .order('order', { ascending: true });

            if (qErr) throw qErr;

            const questionsSorted = (questionsRaw ?? []).map((q: any, i: number) => ({
              id: q.id,
              criteriaId: q.criteria_id,
              text: q.text,
              order: q.order ?? i + 1,
              createdAt: formatTimestamp(q.created_at),
              updatedAt: formatTimestamp(q.updated_at),
            }));

            return {
              id: c.id,
              formId: c.form_id,
              title: c.title,
              description: c.description,
              weight: c.weight,
              questions: questionsSorted,
              createdAt: formatTimestamp(c.created_at),
              updatedAt: formatTimestamp(c.updated_at),
            };
          })
        );

        const criteriasSortedByTitle = criteriasWithQuestions.slice().sort((a: any, b: any) =>
          String(a.title ?? '').localeCompare(String(b.title ?? ''), 'en', { sensitivity: 'base' })
        );

        return {
          ...form,
          createdAt: formatTimestamp((form as any).createdAt),
          updatedAt: formatTimestamp((form as any).updatedAt),
          criterias: criteriasSortedByTitle,
        };
      } catch (error) {
        console.error('fetchFinalFormById error:', error);
        throw error;
      }
    },
    [fetchFormById]
  );

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

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
          } catch {
            // ignore
          }
        }

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [updateForm, fetchFormById, createCriteria, updateCriteria, createQuestion, updateQuestion]
  );

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

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  return {
    finalFormsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages,
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
