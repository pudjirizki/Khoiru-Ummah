import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { AnswerDetailInterface, AnswerDetailsParamsInterface, PayloadCreateAnswerDetailInterface } from '/src/interfaces/answer-details';

// ----------------------------------------------------------------------

export interface UseDatabaseAnswerDetailInterface {
  answerDetailsList: AnswerDetailInterface[];
  isLoading: boolean;
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  answerDetails: (params?: AnswerDetailsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getAnswerDetailById: (id: string) => AnswerDetailInterface | null;
  fetchAnswerDetailById: (id: string) => Promise<AnswerDetailInterface | null>;
  allAnswerDetailsCache: AnswerDetailInterface[];
  createAnswerDetail: (payload: PayloadCreateAnswerDetailInterface) => Promise<{ questionId: string; answerId: string; point: number; id: string }>;
  updateAnswerDetail: (id: string, payload: Partial<Omit<AnswerDetailInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<AnswerDetailInterface | null>;
  deleteAnswerDetail: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapAnswerDetail = (data: any): AnswerDetailInterface => ({
  id: data.id,
  answerId: data.answer_id ?? data.answerId,
  questionId: data.question_id ?? data.questionId,
  point: data.point,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseAnswerDetail = (): UseDatabaseAnswerDetailInterface => {
  const [allAnswerDetailsCache, setAllAnswerDetailsCache] = useState<AnswerDetailInterface[]>([]);
  const [answerDetailsList, setAnswerDetailsList] = useState<AnswerDetailInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<AnswerDetailsParamsInterface>({ answerId: '', questionId: '', limit: 50, perPage: 5 });

  // ALL ANSWER DETAILS CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('answer_details').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) setAllAnswerDetailsCache(data.map(mapAnswerDetail));
    };

    fetchAll();

    const channel = supabase
      .channel(`answer-details-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answer_details' }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllAnswerDetailsCache([]);
    };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);
    try {
      const { answerId, questionId } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('answer_details').select('*').order('created_at', { ascending: false });
      if (answerId) q = q.eq('answer_id', answerId);
      if (questionId) q = q.eq('question_id', questionId);
      q = q.range(from, to);

      const { data } = await q;
      setAnswerDetailsList((data ?? []).map(mapAnswerDetail));
    } finally {
      setIsLoading(false);
    }
    setPage(pageIndex);
  }, []);

  const answerDetails = useCallback(
    (params?: AnswerDetailsParamsInterface) => {
      paramsRef.current = { answerId: params?.answerId ?? '', questionId: params?.questionId ?? '', limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
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
    setAnswerDetailsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  const getAnswerDetailById = useCallback(
    (id: string): AnswerDetailInterface | null => {
      if (!id) return null;
      return allAnswerDetailsCache.find((u) => u.id === id) ?? null;
    },
    [allAnswerDetailsCache]
  );

  const fetchAnswerDetailById = useCallback(async (id: string): Promise<AnswerDetailInterface | null> => {
    if (!id) return null;
    try {
      const { data } = await supabase.from('answer_details').select('*').eq('id', id).limit(1).single();
      return data ? mapAnswerDetail(data) : null;
    } catch {
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const createAnswerDetail = useCallback(async (payload: PayloadCreateAnswerDetailInterface) => {
    try {
      const docId = uuidv4();
      const now = new Date().toISOString();
      const { error } = await supabase.from('answer_details').insert({
        id: docId,
        question_id: payload.questionId,
        answer_id: payload.answerId,
        point: payload.point,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(error.message);
      return { id: docId, ...payload };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  const updateAnswerDetail = useCallback(
    async (id: string, payload: Partial<Omit<AnswerDetailInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnswerDetailInterface | null> => {
      if (!id) return null;
      try {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.questionId !== undefined) updateData.question_id = payload.questionId;
        if (payload.answerId !== undefined) updateData.answer_id = payload.answerId;
        if (payload.point !== undefined) updateData.point = payload.point;

        const { data, error } = await supabase.from('answer_details').update(updateData).eq('id', id).select().single();
        if (error) throw new Error(error.message);

        const updated = mapAnswerDetail(data);
        setAllAnswerDetailsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setAnswerDetailsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    []
  );

  const deleteAnswerDetail = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('answer_details').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setAllAnswerDetailsCache((prev) => prev.filter((u) => u.id !== id));
      setAnswerDetailsList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) {
      throw safeWrapError(err);
    }
  }, []);

  const hasNext = page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
  const hasPrev = page > 1;

  return {
    answerDetailsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    answerDetails,
    nextPage,
    prevPage,
    resetPagination,
    getAnswerDetailById,
    fetchAnswerDetailById,
    createAnswerDetail,
    updateAnswerDetail,
    deleteAnswerDetail,
    allAnswerDetailsCache,
  };
};
