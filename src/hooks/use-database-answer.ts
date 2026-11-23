import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
<<<<<<< Updated upstream
import { supabase } from '/src/supabase';
import { subscribeToTableChanges } from '/src/supabase/realtime';
=======
import { createRealtimeChannel, supabase } from '/src/supabase';
>>>>>>> Stashed changes
// interfaces
import { AnswerInterface, AnswersParamsInterface, PayloadCreateAnswerInterface } from '/src/interfaces/answer';
import { toError } from '/src/utils/to-error';

// ----------------------------------------------------------------------

export interface UseDatabaseAnswerInterface {
  answersList: AnswerInterface[];
  isLoading: boolean;
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  answers: (params?: AnswersParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getAnswerById: (id: string) => AnswerInterface | null;
  fetchAnswerById: (id: string) => Promise<AnswerInterface | null>;
  allAnswersCache: AnswerInterface[];
  createAnswer: (payload: PayloadCreateAnswerInterface) => Promise<{ criteriaId: string; assessmentId: string; averagePoint: number; id: string }>;
  updateAnswer: (id: string, payload: Partial<Omit<AnswerInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<AnswerInterface | null>;
  deleteAnswer: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapAnswer = (data: any): AnswerInterface => ({
  id: data.id,
  assessmentId: data.assessment_id ?? data.assessmentId,
  criteriaId: data.criteria_id ?? data.criteriaId,
  averagePoint: data.average_point ?? data.averagePoint,
  createdAt: data.created_at ? new Date(data.created_at) : new Date(data.createdAt || Date.now()),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(data.updatedAt || Date.now()),
});

// ----------------------------------------------------------------------

export const useDatabaseAnswer = (): UseDatabaseAnswerInterface => {
  const [allAnswersCache, setAllAnswersCache] = useState<AnswerInterface[]>([]);
  const [answersList, setAnswersList] = useState<AnswerInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<AnswersParamsInterface>({ assessmentId: '', criteriaId: '', limit: 50, perPage: 5 });

  // ALL ANSWERS CACHE with realtime
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      const { data } = await supabase.from('answers').select('*').order('created_at', { ascending: true });
      if (data && isMounted) setAllAnswersCache(data.map(mapAnswer));
    };
    fetchAll();
<<<<<<< Updated upstream
    const unsubscribe = subscribeToTableChanges('answers', fetchAll);
    return () => { isMounted = false; unsubscribe(); };
=======
    const channel = createRealtimeChannel('public:answers_cache')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => fetchAll())
      .subscribe();
    return () => { isMounted = false; supabase.removeChannel(channel); };
>>>>>>> Stashed changes
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const pageSize = perPageRef.current;
    const { assessmentId, criteriaId } = paramsRef.current;
    const from = (pageIndex - 1) * pageSize;
    const to = from + pageSize - 1;
    setIsLoading(true);
    try {
      let q = supabase.from('answers').select('*', { count: 'exact' });
      if (assessmentId) q = q.eq('assessment_id', assessmentId);
      if (criteriaId) q = q.eq('criteria_id', criteriaId);
      q = q.order('created_at', { ascending: false }).range(from, to);
      const { data, count, error } = await q;
      if (!error && data) {
        setAnswersList(data.map(mapAnswer));
        if (count !== null && count !== undefined) setTotalCount(count);
      }
    } catch (err) {
      console.error('subscribePage answers error', err);
    } finally {
      setIsLoading(false);
      setPage(pageIndex);
    }
  }, []);

  const answers = useCallback((params?: AnswersParamsInterface) => {
    paramsRef.current = { assessmentId: params?.assessmentId ?? '', criteriaId: params?.criteriaId ?? '', limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
    limitRef.current = params?.limit ?? 50;
    perPageRef.current = params?.perPage ?? 5;
    subscribePage(1);
  }, [subscribePage]);

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  const nextPage = useCallback(() => { if (page < maxPages) subscribePage(page + 1); }, [page, maxPages, subscribePage]);
  const prevPage = useCallback(() => { if (page > 1) subscribePage(page - 1); }, [page, subscribePage]);
  const resetPagination = useCallback(() => { setAnswersList([]); setPage(1); setIsLoading(false); }, []);

  const getAnswerById = useCallback((id: string) => allAnswersCache.find((u) => u.id === id) ?? null, [allAnswersCache]);

  const fetchAnswerById = useCallback(async (id: string): Promise<AnswerInterface | null> => {
    if (!id) return null;
    const { data, error } = await supabase.from('answers').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapAnswer(data);
  }, []);

  const createAnswer = useCallback(async (payload: PayloadCreateAnswerInterface) => {
    try {
      const { data, error } = await supabase.from('answers').insert({
        id: uuidv4(),
        criteria_id: payload.criteriaId,
        assessment_id: payload.assessmentId,
        average_point: payload.averagePoint,
      }).select().single();
      if (error) throw error;
      return { id: data.id, criteriaId: payload.criteriaId, assessmentId: payload.assessmentId, averagePoint: payload.averagePoint };
    } catch (error) { throw toError(error); }
  }, []);

  const updateAnswer = useCallback(async (id: string, payload: Partial<Omit<AnswerInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnswerInterface | null> => {
    if (!id) return null;
    try {
      const updateData: any = {};
      if (payload.criteriaId !== undefined) updateData.criteria_id = payload.criteriaId;
      if (payload.assessmentId !== undefined) updateData.assessment_id = payload.assessmentId;
      if (payload.averagePoint !== undefined) updateData.average_point = payload.averagePoint;
      const { data, error } = await supabase.from('answers').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return mapAnswer(data);
    } catch (err) { throw toError(err); }
  }, []);

  const deleteAnswer = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('answers').delete().eq('id', id);
      if (error) throw error;
      setAllAnswersCache((prev) => prev.filter((u) => u.id !== id));
      setAnswersList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) { throw toError(err); }
  }, []);

  return { answersList, isLoading, page, perPage: perPageRef.current, maxPages, hasNext, hasPrev, answers, nextPage, prevPage, resetPagination, getAnswerById, fetchAnswerById, createAnswer, updateAnswer, deleteAnswer, allAnswersCache };
};
