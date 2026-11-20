import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { QuestionInterface, PayloadCreateQuestionInterface, QuestionsParamsInterface } from '/src/interfaces/question';

// ----------------------------------------------------------------------

export interface UseDatabaseQuestionInterface {
  questionsList: QuestionInterface[];
  isLoading: boolean;
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  questions: (params?: QuestionsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getQuestionById: (id: string) => QuestionInterface | null;
  fetchQuestionById: (id: string) => Promise<QuestionInterface | null>;
  allQuestionsCache: QuestionInterface[];
  createQuestion: (payload: PayloadCreateQuestionInterface) => Promise<{ criteriaId: string; order: number; text: string; id: string }>;
  updateQuestion: (id: string, payload: Partial<Omit<QuestionInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<QuestionInterface | null>;
  deleteQuestion: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapQuestion = (data: any): QuestionInterface => ({
  id: data.id,
  criteriaId: data.criteria_id ?? data.criteriaId,
  order: data.order,
  text: data.text,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseQuestion = (): UseDatabaseQuestionInterface => {
  const [allQuestionsCache, setAllQuestionsCache] = useState<QuestionInterface[]>([]);
  const [questionsList, setQuestionsList] = useState<QuestionInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<QuestionsParamsInterface>({ criteriaId: '', limit: 50, perPage: 5 });

  // ALL QUESTIONS CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) setAllQuestionsCache(data.map(mapQuestion));
    };

    fetchAll();

    const channel = supabase
      .channel(`questions-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllQuestionsCache([]);
    };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);
    try {
      const { criteriaId } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('questions').select('*').order('created_at', { ascending: false });
      if (criteriaId) q = q.eq('criteria_id', criteriaId);
      q = q.range(from, to);

      const { data } = await q;
      setQuestionsList((data ?? []).map(mapQuestion));
    } finally {
      setIsLoading(false);
    }
    setPage(pageIndex);
  }, []);

  const questions = useCallback(
    (params?: QuestionsParamsInterface) => {
      paramsRef.current = { criteriaId: params?.criteriaId ?? '', limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
      limitRef.current = params?.limit ?? 50;
      perPageRef.current = params?.perPage ?? 5;
      subscribePage(1);
    },
    [subscribePage]
  );

  const nextPage = useCallback(() => {
    if (page >= Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current))) return;
    subscribePage(page + 1);
  }, [page, subscribePage]);

  const prevPage = useCallback(() => {
    if (page <= 1) return;
    subscribePage(page - 1);
  }, [page, subscribePage]);

  const resetPagination = useCallback(() => {
    setQuestionsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  const getQuestionById = useCallback(
    (id: string): QuestionInterface | null => {
      if (!id) return null;
      return allQuestionsCache.find((u) => u.id === id) ?? null;
    },
    [allQuestionsCache]
  );

  const fetchQuestionById = useCallback(async (id: string): Promise<QuestionInterface | null> => {
    if (!id) return null;
    try {
      const { data } = await supabase.from('questions').select('*').eq('id', id).limit(1).single();
      return data ? mapQuestion(data) : null;
    } catch {
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const createQuestion = useCallback(async (payload: PayloadCreateQuestionInterface) => {
    try {
      const docId = uuidv4();
      const now = new Date().toISOString();
      const { error } = await supabase.from('questions').insert({
        id: docId,
        criteria_id: payload.criteriaId,
        order: payload.order,
        text: payload.text,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(error.message);
      return { id: docId, ...payload };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  const updateQuestion = useCallback(
    async (id: string, payload: Partial<Omit<QuestionInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<QuestionInterface | null> => {
      if (!id) return null;
      try {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.criteriaId !== undefined) updateData.criteria_id = payload.criteriaId;
        if (payload.order !== undefined) updateData.order = payload.order;
        if (payload.text !== undefined) updateData.text = payload.text;

        const { data, error } = await supabase.from('questions').update(updateData).eq('id', id).select().single();
        if (error) throw new Error(error.message);

        const updated = mapQuestion(data);
        setAllQuestionsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setQuestionsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    []
  );

  const deleteQuestion = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('questions').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setAllQuestionsCache((prev) => prev.filter((u) => u.id !== id));
      setQuestionsList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) {
      throw safeWrapError(err);
    }
  }, []);

  const hasNext = page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
  const hasPrev = page > 1;

  return {
    questionsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    questions,
    nextPage,
    prevPage,
    resetPagination,
    getQuestionById,
    fetchQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    allQuestionsCache,
  };
};
