import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/supabase';
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
  createQuestion: (payload: PayloadCreateQuestionInterface) => Promise<{
    criteriaId: string;
    order: number;
    text: string;
    id: string;
  }>;
  updateQuestion: (id: string, payload: Partial<Omit<QuestionInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<QuestionInterface | null>;
  deleteQuestion: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapQuestion = (data: any): QuestionInterface => ({
  id: data.id,
  criteriaId: data.criteria_id ?? data.criteriaId,
  order: Number(data.order_num ?? data.order ?? 0),
  text: data.text,
  createdAt: data.created_at ? new Date(data.created_at) : new Date(),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
});

// ----------------------------------------------------------------------

export const useDatabaseQuestion = (): UseDatabaseQuestionInterface => {
  const [allQuestionsCache, setAllQuestionsCache] = useState<QuestionInterface[]>([]);
  const [questionsList, setQuestionsList] = useState<QuestionInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<QuestionsParamsInterface>({ criteriaId: '', limit: 50, perPage: 5 });

  // ALL QUESTION CACHE (fetch + Supabase Realtime channel)
  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        const { data, error } = await supabase
          .from('questions')
          .select('*')
          .order('order_num', { ascending: true });

        if (error) {
          console.error('allQuestionsCache fetch error', error);
          if (isMounted) setAllQuestionsCache([]);
          return;
        }

        if (isMounted) setAllQuestionsCache((data ?? []).map(mapQuestion));
      } catch (err) {
        console.error('allQuestionsCache fetch error', err);
        if (isMounted) setAllQuestionsCache([]);
      }
    };

    fetchAll();

    const channel = supabase
      .channel('questions-cache')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      setAllQuestionsCache([]);
    };
  }, []);

  const subscribePage = useCallback(
    async (pageIndex: number) => {
      const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
      if (pageIndex < 1 || pageIndex > max) return;

      setIsLoading(true);

      try {
        const { criteriaId } = paramsRef.current;
        const pageSize = perPageRef.current;
        const from = (pageIndex - 1) * pageSize;
        const to = from + pageSize - 1;

        let queryBuilder = supabase
          .from('questions')
          .select('*', { count: 'exact' });

        if (criteriaId) {
          queryBuilder = queryBuilder.eq('criteria_id', criteriaId);
        }

        queryBuilder = queryBuilder
          .order('order_num', { ascending: true })
          .range(from, to);

        const { data, count, error } = await queryBuilder;

        if (error) {
          console.error('paginate fetch error', error.code, error.message);
          setIsLoading(false);
          return;
        }

        const list = (data ?? []).map(mapQuestion);
        setQuestionsList(list);
        if (count !== null) setTotalCount(count);
        setIsLoading(false);
        setPage(pageIndex);
      } catch (err: any) {
        console.error('paginate error', err);
        setIsLoading(false);
      }
    },
    []
  );

  const questions = useCallback(
    (params?: QuestionsParamsInterface) => {
      const criteriaId = params?.criteriaId ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { criteriaId, limit, perPage };
      limitRef.current = limit;
      perPageRef.current = perPage;

      subscribePage(1);
    },
    [subscribePage]
  );

  const nextPage = useCallback(() => {
    const max = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
    if (page >= max) return;
    subscribePage(page + 1);
  }, [page, totalCount, subscribePage]);

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
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();

      if (error || !data) return null;
      return mapQuestion(data);
    } catch (err) {
      console.error('fetchQuestionById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CREATE QUESTION
  const createQuestion = useCallback(async (payload: PayloadCreateQuestionInterface) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .insert({
          criteria_id: payload.criteriaId,
          order_num: payload.order,
          text: payload.text,
        })
        .select()
        .single();

      if (error || !data) throw new Error(error?.message ?? 'Failed to create question');

      return {
        id: data.id,
        criteriaId: payload.criteriaId,
        order: payload.order,
        text: payload.text,
      };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  // UPDATE QUESTION
  const updateQuestion = useCallback(
    async (id: string, payload: Partial<Omit<QuestionInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<QuestionInterface | null> => {
      if (!id) return null;

      try {
        const updateData: Record<string, any> = {};
        if (payload.criteriaId !== undefined) updateData['criteria_id'] = payload.criteriaId;
        if (payload.order !== undefined) updateData['order_num'] = payload.order;
        if (payload.text !== undefined) updateData['text'] = payload.text;

        const { data, error } = await supabase
          .from('questions')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error || !data) return null;

        const updated = mapQuestion(data);

        setAllQuestionsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setQuestionsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllQuestionsCache, setQuestionsList]
  );

  // DELETE QUESTION
  const deleteQuestion = useCallback(
    async (id: string): Promise<boolean> => {
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
    },
    [setAllQuestionsCache, setQuestionsList]
  );

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  return {
    questionsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages,
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
