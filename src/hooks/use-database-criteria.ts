import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { CriteriaInterface, PayloadCreateCriteriaInterface, CriteriasParamsInterface } from '/src/interfaces/criteria';

// ----------------------------------------------------------------------

export interface UseDatabaseCriteriaInterface {
  criteriasList: CriteriaInterface[];
  isLoading: boolean;
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  criterias: (params?: CriteriasParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getCriteriaById: (id: string) => CriteriaInterface | null;
  fetchCriteriaById: (id: string) => Promise<CriteriaInterface | null>;
  allCriteriasCache: CriteriaInterface[];
  createCriteria: (payload: PayloadCreateCriteriaInterface) => Promise<{ formId: string; title: string; description: string; weight: number; id: string }>;
  updateCriteria: (id: string, payload: Partial<Omit<CriteriaInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<CriteriaInterface | null>;
  deleteCriteria: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapCriteria = (data: any): CriteriaInterface => ({
  id: data.id,
  formId: data.form_id ?? data.formId,
  title: data.title,
  description: data.description,
  weight: data.weight,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseCriteria = (): UseDatabaseCriteriaInterface => {
  const [allCriteriasCache, setAllCriteriasCache] = useState<CriteriaInterface[]>([]);
  const [criteriasList, setCriteriasList] = useState<CriteriaInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<CriteriasParamsInterface>({ formId: '', limit: 50, perPage: 5 });

  // ALL CRITERIAS CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('criterias').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) setAllCriteriasCache(data.map(mapCriteria));
    };

    fetchAll();

    const channel = supabase
      .channel(`criterias-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criterias' }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllCriteriasCache([]);
    };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);

    try {
      const { formId } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('criterias').select('*').order('created_at', { ascending: false });
      if (formId) q = q.eq('form_id', formId);
      q = q.range(from, to);

      const { data } = await q;
      setCriteriasList((data ?? []).map(mapCriteria));
    } finally {
      setIsLoading(false);
    }

    setPage(pageIndex);
  }, []);

  const criterias = useCallback(
    (params?: CriteriasParamsInterface) => {
      paramsRef.current = { formId: params?.formId ?? '', limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
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
    setCriteriasList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  const getCriteriaById = useCallback(
    (id: string): CriteriaInterface | null => {
      if (!id) return null;
      return allCriteriasCache.find((u) => u.id === id) ?? null;
    },
    [allCriteriasCache]
  );

  const fetchCriteriaById = useCallback(async (id: string): Promise<CriteriaInterface | null> => {
    if (!id) return null;
    try {
      const { data } = await supabase.from('criterias').select('*').eq('id', id).limit(1).single();
      return data ? mapCriteria(data) : null;
    } catch {
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const createCriteria = useCallback(async (payload: PayloadCreateCriteriaInterface) => {
    try {
      const docId = uuidv4();
      const now = new Date().toISOString();
      const { error } = await supabase.from('criterias').insert({
        id: docId,
        form_id: payload.formId,
        title: payload.title,
        description: payload.description,
        weight: payload.weight,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(error.message);
      return { id: docId, ...payload };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  const updateCriteria = useCallback(
    async (id: string, payload: Partial<Omit<CriteriaInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CriteriaInterface | null> => {
      if (!id) return null;
      try {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.formId !== undefined) updateData.form_id = payload.formId;
        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.weight !== undefined) updateData.weight = payload.weight;

        const { data, error } = await supabase.from('criterias').update(updateData).eq('id', id).select().single();
        if (error) throw new Error(error.message);

        const updated = mapCriteria(data);
        setAllCriteriasCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setCriteriasList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    []
  );

  const deleteCriteria = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('criterias').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setAllCriteriasCache((prev) => prev.filter((u) => u.id !== id));
      setCriteriasList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) {
      throw safeWrapError(err);
    }
  }, []);

  const hasNext = page < Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
  const hasPrev = page > 1;

  return {
    criteriasList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    criterias,
    nextPage,
    prevPage,
    resetPagination,
    getCriteriaById,
    fetchCriteriaById,
    createCriteria,
    updateCriteria,
    deleteCriteria,
    allCriteriasCache,
  };
};
