import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { AnswerInterface, AnswersParamsInterface, PayloadCreateAnswerInterface } from '/src/interfaces/answer';

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
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseAnswer = (): UseDatabaseAnswerInterface => {
  const [allAnswersCache, setAllAnswersCache] = useState<AnswerInterface[]>([]);
  const [answersList, setAnswersList] = useState<AnswerInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<AnswersParamsInterface>({ assessmentId: '', criteriaId: '', limit: 50, perPage: 5 });

  // ALL ANSWERS CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('answers').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) setAllAnswersCache(data.map(mapAnswer));
    };

    fetchAll();

    const channel = supabase
      .channel(`answers-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllAnswersCache([]);
    };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);
    try {
      const { assessmentId, criteriaId } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('answers').select('*').order('created_at', { ascending: false });
      if (assessmentId) q = q.eq('assessment_id', assessmentId);
      if (criteriaId) q = q.eq('criteria_id', criteriaId);
      q = q.range(from, to);

      const { data } = await q;
      setAnswersList((data ?? []).map(mapAnswer));
    } finally {
      setIsLoading(false);
    }
    setPage(pageIndex);
  }, []);

  const answers = useCallback(
    (params?: AnswersParamsInterface) => {
      paramsRef.current = { assessmentId: params?.assessmentId ?? '', criteriaId: params?.criteriaId ?? '', limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
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
    setAnswersList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  const getAnswerById = useCallback(
    (id: string): AnswerInterface | null => {
      if (!id) return null;
      return allAnswersCache.find((u) => u.id === id) ?? null;
    },
    [allAnswersCache]
  );

  const fetchAnswerById = useCallback(async (id: string): Promise<AnswerInterface | null> => {
    if (!id) return null;
    try {
      const { data } = await supabase.from('answers').select('*').eq('id', id).limit(1).single();
      return data ? mapAnswer(data) : null;
    } catch {
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const createAnswer = useCallback(async (payload: PayloadCreateAnswerInterface) => {
    try {
      const docId = uuidv4();
      const now = new Date().toISOString();
      const { error } = await supabase.from('answers').insert({
        id: docId,
        criteria_id: payload.criteriaId,
        assessment_id: payload.assessmentId,
        average_point: payload.averagePoint,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(error.message);
      return { id: docId, ...payload };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  const updateAnswer = useCallback(
    async (id: string, payload: Partial<Omit<AnswerInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnswerInterface | null> => {
      if (!id) return null;
      try {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.criteriaId !== undefined) updateData.criteria_id = payload.criteriaId;
        if (payload.assessmentId !== undefined) updateData.assessment_id = payload.assessmentId;
        if (payload.averagePoint !== undefined) updateData.average_point = payload.averagePoint;

        const { data, error } = await supabase.from('answers').update(updateData).eq('id', id).select().single();
        if (error) throw new Error(error.message);

        const updated = mapAnswer(data);
        setAllAnswersCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setAnswersList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    []
  );

  const deleteAnswer = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('answers').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setAllAnswersCache((prev) => prev.filter((u) => u.id !== id));
      setAnswersList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) {
      throw safeWrapError(err);
    }
  }, []);

  const hasNext = page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
  const hasPrev = page > 1;

  return {
    answersList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    answers,
    nextPage,
    prevPage,
    resetPagination,
    getAnswerById,
    fetchAnswerById,
    createAnswer,
    updateAnswer,
    deleteAnswer,
    allAnswersCache,
  };
};
