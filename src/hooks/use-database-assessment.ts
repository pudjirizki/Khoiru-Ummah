import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/supabase';
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
  createdAt: data.created_at ? new Date(data.created_at) : new Date(data.createdAt || Date.now()),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(data.updatedAt || Date.now()),
});

const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

// ----------------------------------------------------------------------

export const useDatabaseAssessment = (): UseDatabaseAssessmentInterface => {
  const [allAssessmentsCache, setAllAssessmentsCache] = useState<AssessmentInterface[]>([]);
  const [assessmentsList, setAssessmentsList] = useState<AssessmentInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<AssessmentsParamsInterface>({ formId: '', userId: '', studentId: '', limit: 50, perPage: 5 });

  // ALL CACHE with realtime
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      const { data } = await supabase.from('assessments').select('*').order('created_at', { ascending: true });
      if (data && isMounted) setAllAssessmentsCache(data.map(mapAssessment));
    };
    fetchAll();
    const channel = supabase.channel('public:assessments_cache')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => fetchAll())
      .subscribe();
    return () => { isMounted = false; supabase.removeChannel(channel); };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const pageSize = perPageRef.current;
    const { formId, userId, studentId } = paramsRef.current;
    const from = (pageIndex - 1) * pageSize;
    const to = from + pageSize - 1;
    setIsLoading(true);
    try {
      let q = supabase.from('assessments').select('*', { count: 'exact' });
      if (formId) q = q.eq('form_id', formId);
      if (userId) q = q.eq('user_id', userId);
      if (studentId) q = q.eq('student_id', studentId);
      q = q.order('created_at', { ascending: false }).range(from, to);
      const { data, count, error } = await q;
      if (!error && data) {
        setAssessmentsList(data.map(mapAssessment));
        if (count !== null && count !== undefined) setTotalCount(count);
      }
    } catch (err) {
      console.error('subscribePage assessments error', err);
    } finally {
      setIsLoading(false);
      setPage(pageIndex);
    }
  }, []);

  const assessments = useCallback((params?: AssessmentsParamsInterface) => {
    paramsRef.current = { formId: params?.formId ?? '', userId: params?.userId ?? '', studentId: params?.studentId ?? '', limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
    limitRef.current = params?.limit ?? 50;
    perPageRef.current = params?.perPage ?? 5;
    subscribePage(1);
  }, [subscribePage]);

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  const nextPage = useCallback(() => { if (page < maxPages) subscribePage(page + 1); }, [page, maxPages, subscribePage]);
  const prevPage = useCallback(() => { if (page > 1) subscribePage(page - 1); }, [page, subscribePage]);
  const resetPagination = useCallback(() => { setAssessmentsList([]); setPage(1); setIsLoading(false); }, []);

  const getAssessmentById = useCallback((id: string) => allAssessmentsCache.find((u) => u.id === id) ?? null, [allAssessmentsCache]);

  const fetchAssessmentById = useCallback(async (id: string): Promise<AssessmentInterface | null> => {
    if (!id) return null;
    const { data, error } = await supabase.from('assessments').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapAssessment(data);
  }, []);

  const createAssessment = useCallback(async (payload: PayloadCreateAssessmentInterface) => {
    try {
      const { data, error } = await supabase.from('assessments').insert({
        form_id: payload.formId,
        student_id: payload.studenId,
        student_class: payload.studentClass ?? '',
        catatan: typeof payload.catatan === 'string' ? payload.catatan.trim() : '',
        user_id: payload.userId,
        score: payload.score,
      }).select().single();
      if (error) throw error;
      return { id: data.id, formId: payload.formId, studenId: payload.studenId, userId: payload.userId, score: payload.score };
    } catch (error) { throw safeWrapError(error); }
  }, []);

  const updateAssessment = useCallback(async (id: string, payload: Partial<Omit<AssessmentInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AssessmentInterface | null> => {
    if (!id) return null;
    try {
      const updateData: any = {};
      if (payload.formId !== undefined) updateData.form_id = payload.formId;
      if (payload.studenId !== undefined) updateData.student_id = payload.studenId;
      if (payload.studentClass !== undefined) updateData.student_class = payload.studentClass;
      if (payload.catatan !== undefined) updateData.catatan = payload.catatan;
      if (payload.userId !== undefined) updateData.user_id = payload.userId;
      if (payload.score !== undefined) updateData.score = payload.score;
      const { data, error } = await supabase.from('assessments').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      return mapAssessment(data);
    } catch (err) { throw safeWrapError(err); }
  }, []);

  const deleteAssessment = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('assessments').delete().eq('id', id);
      if (error) throw error;
      setAllAssessmentsCache((prev) => prev.filter((u) => u.id !== id));
      setAssessmentsList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) { throw safeWrapError(err); }
  }, []);

  return { assessmentsList, isLoading, page, perPage: perPageRef.current, maxPages, hasNext, hasPrev, assessments, nextPage, prevPage, resetPagination, getAssessmentById, fetchAssessmentById, createAssessment, updateAssessment, deleteAssessment, allAssessmentsCache };
};
