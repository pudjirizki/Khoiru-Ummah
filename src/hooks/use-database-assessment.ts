import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { AssessmentInterface, AssessmentsParamsInterface, PayloadCreateAssessmentInterface } from '/src/interfaces/assessment';

// ----------------------------------------------------------------------

export interface UseDatabaseAssessmentInterface {
  assessmentsList: AssessmentInterface[];
  isLoading: boolean;
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  assessments: (params?: AssessmentsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getAssessmentById: (id: string) => AssessmentInterface | null;
  fetchAssessmentById: (id: string) => Promise<AssessmentInterface | null>;
  allAssessmentsCache: AssessmentInterface[];
  createAssessment: (payload: PayloadCreateAssessmentInterface) => Promise<{ formId: string; studenId: string; userId: string; score: number; id: string }>;
  updateAssessment: (id: string, payload: Partial<Omit<AssessmentInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<AssessmentInterface | null>;
  deleteAssessment: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapAssessment = (data: any): AssessmentInterface => ({
  id: data.id,
  formId: data.form_id ?? data.formId,
  studenId: data.student_id ?? data.studenId,
  studentClass: data.student_class ?? data.studentClass,
  catatan: data.catatan,
  userId: data.user_id ?? data.userId,
  score: data.score,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseAssessment = (): UseDatabaseAssessmentInterface => {
  const [allAssessmentsCache, setAllAssessmentsCache] = useState<AssessmentInterface[]>([]);
  const [assessmentsList, setAssessmentsList] = useState<AssessmentInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<AssessmentsParamsInterface>({ formId: '', userId: '', studentId: '', limit: 50, perPage: 5 });

  // ALL ASSESSMENTS CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('assessments').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) setAllAssessmentsCache(data.map(mapAssessment));
    };

    fetchAll();

    const channel = supabase
      .channel(`assessments-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllAssessmentsCache([]);
    };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);
    try {
      const { formId, userId, studentId } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('assessments').select('*').order('created_at', { ascending: false });
      if (formId) q = q.eq('form_id', formId);
      if (userId) q = q.eq('user_id', userId);
      if (studentId) q = q.eq('student_id', studentId);
      q = q.range(from, to);

      const { data } = await q;
      setAssessmentsList((data ?? []).map(mapAssessment));
    } finally {
      setIsLoading(false);
    }
    setPage(pageIndex);
  }, []);

  const assessments = useCallback(
    (params?: AssessmentsParamsInterface) => {
      paramsRef.current = {
        formId: params?.formId ?? '',
        userId: params?.userId ?? '',
        studentId: params?.studentId ?? '',
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
    if (page >= Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current))) return;
    subscribePage(page + 1);
  }, [page, subscribePage]);

  const prevPage = useCallback(() => {
    if (page <= 1) return;
    subscribePage(page - 1);
  }, [page, subscribePage]);

  const resetPagination = useCallback(() => {
    setAssessmentsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  const getAssessmentById = useCallback(
    (id: string): AssessmentInterface | null => {
      if (!id) return null;
      return allAssessmentsCache.find((u) => u.id === id) ?? null;
    },
    [allAssessmentsCache]
  );

  const fetchAssessmentById = useCallback(async (id: string): Promise<AssessmentInterface | null> => {
    if (!id) return null;
    try {
      const { data } = await supabase.from('assessments').select('*').eq('id', id).limit(1).single();
      return data ? mapAssessment(data) : null;
    } catch {
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const createAssessment = useCallback(async (payload: PayloadCreateAssessmentInterface) => {
    try {
      const docId = uuidv4();
      const now = new Date().toISOString();
      const catatan = typeof payload.catatan === 'string' ? payload.catatan.trim() : '';

      const { error } = await supabase.from('assessments').insert({
        id: docId,
        form_id: payload.formId,
        student_id: payload.studenId,
        user_id: payload.userId,
        student_class: payload.studentClass ?? '',
        catatan,
        score: payload.score,
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);
      return { id: docId, ...payload, catatan };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  const updateAssessment = useCallback(
    async (id: string, payload: Partial<Omit<AssessmentInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AssessmentInterface | null> => {
      if (!id) return null;
      try {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.formId !== undefined) updateData.form_id = payload.formId;
        if (payload.studenId !== undefined) updateData.student_id = payload.studenId;
        if (payload.userId !== undefined) updateData.user_id = payload.userId;
        if (payload.studentClass !== undefined) updateData.student_class = payload.studentClass;
        if (payload.catatan !== undefined) updateData.catatan = payload.catatan;
        if (payload.score !== undefined) updateData.score = payload.score;

        const { data, error } = await supabase.from('assessments').update(updateData).eq('id', id).select().single();
        if (error) throw new Error(error.message);

        const updated = mapAssessment(data);
        setAllAssessmentsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setAssessmentsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    []
  );

  const deleteAssessment = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setAllAssessmentsCache((prev) => prev.filter((u) => u.id !== id));
      setAssessmentsList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) {
      throw safeWrapError(err);
    }
  }, []);

  const hasNext = page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
  const hasPrev = page > 1;

  return {
    assessmentsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    assessments,
    nextPage,
    prevPage,
    resetPagination,
    getAssessmentById,
    fetchAssessmentById,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    allAssessmentsCache,
  };
};
