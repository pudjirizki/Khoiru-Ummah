import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/supabase';
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
  createdAt: data.created_at ? new Date(data.created_at) : new Date(data.createdAt || Date.now()),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(data.updatedAt || Date.now()),
});

const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

// ----------------------------------------------------------------------

export const useDatabaseAnswerDetail = (): UseDatabaseAnswerDetailInterface => {
  const [allAnswerDetailsCache, setAllAnswerDetailsCache] = useState<AnswerDetailInterface[]>([]);
  const [answerDetailsList, setAnswerDetailsList] = useState<AnswerDetailInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<AnswerDetailsParamsInterface>({ answerId: '', questionId: '', limit: 50, perPage: 5 });

  // ALL CACHE with realtime
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      const { data } = await supabase.from('answer_details').select('*').order('created_at', { ascending: true });
      if (data && isMounted) setAllAnswerDetailsCache(data.map(mapAnswerDetail));
    };
    fetchAll();
    const channel = supabase.channel('public:answer_details_cache')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answer_details' }, () => fetchAll())
      .subscribe();
    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const pageSize = perPageRef.current;
    const { answerId, questionId } = paramsRef.current;
    const from = (pageIndex - 1) * pageSize;
    const to = from + pageSize - 1;
    setIsLoading(true);
    try {
      let q = supabase.from('answer_details').select('*', { count: 'exact' });
      if (answerId) q = q.eq('answer_id', answerId);
      if (questionId) q = q.eq('question_id', questionId);
      q = q.order('created_at', { ascending: false }).range(from, to);
      const { data, count, error } = await q;
      if (!error && data) {
        setAnswerDetailsList(data.map(mapAnswerDetail));
        if (count !== null && count !== undefined) setTotalCount(count);
      }
    } catch (err) {
      console.error('subscribePage answer_details error', err);
    } finally {
      setIsLoading(false);
      setPage(pageIndex);
    }
  }, []);

  const answerDetails = useCallback((params?: AnswerDetailsParamsInterface) => {
    paramsRef.current = { answerId: params?.answerId ?? '', questionId: params?.questionId ?? '', limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
    limitRef.current = params?.limit ?? 50;
    perPageRef.current = params?.perPage ?? 5;
    subscribePage(1);
  }, [subscribePage]);

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  const nextPage = useCallback(() => { if (page < maxPages) subscribePage(page + 1); }, [page, maxPages, subscribePage]);
  const prevPage = useCallback(() => { if (page > 1) subscribePage(page - 1); }, [page, subscribePage]);
  const resetPagination = useCallback(() => { setAnswerDetailsList([]); setPage(1); setIsLoading(false); }, []);

  const getAnswerDetailById = useCallback((id: string) => allAnswerDetailsCache.find((u) => u.id === id) ?? null, [allAnswerDetailsCache]);

  const fetchAnswerDetailById = useCallback(async (id: string): Promise<AnswerDetailInterface | null> => {
    if (!id) return null;
    const { data, error } = await supabase.from('answer_details').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapAnswerDetail(data);
  }, []);

  const createAnswerDetail = useCallback(async (payload: PayloadCreateAnswerDetailInterface) => {
    try {
      const { data, error } = await supabase.from('answer_details').insert({
        question_id: payload.questionId,
        answer_id: payload.answerId,
        point: payload.point,
      }).select().single();
      if (error) throw error;
      return { id: data.id, questionId: payload.questionId, answerId: payload.answerId, point: payload.point };
    } catch (error) { throw safeWrapError(error); }
  }, []);

  const updateAnswerDetail = useCallback(async (id: string, payload: Partial<Omit<AnswerDetailInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnswerDetailInterface | null> => {
    if (!id) return null;
    try {
      const updateData: any = {};
      if (payload.questionId !== undefined) updateData.question_id = payload.questionId;
      if (payload.answerId !== undefined) updateData.answer_id = payload.answerId;
      if (payload.point !== undefined) updateData.point = payload.point;
      const { data, error } = await supabase.from('answer_details').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return mapAnswerDetail(data);
    } catch (err) { throw safeWrapError(err); }
  }, []);

  const deleteAnswerDetail = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('answer_details').delete().eq('id', id);
      if (error) throw error;
      setAllAnswerDetailsCache((prev) => prev.filter((u) => u.id !== id));
      setAnswerDetailsList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) { throw safeWrapError(err); }
  }, []);

  return { answerDetailsList, isLoading, page, perPage: perPageRef.current, maxPages, hasNext, hasPrev, answerDetails, nextPage, prevPage, resetPagination, getAnswerDetailById, fetchAnswerDetailById, createAnswerDetail, updateAnswerDetail, deleteAnswerDetail, allAnswerDetailsCache };
};
