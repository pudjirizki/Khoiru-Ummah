import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/supabase';
// interfaces
import { CriteriaInterface, PayloadCreateCriteriaInterface, CriteriasParamsInterface } from '/src/interfaces/criteria';

// ----------------------------------------------------------------------

export interface UseDatabaseCriteriaInterface {
  criteriasList: CriteriaInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  criterias: (params?: CriteriasParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getCriteriaById: (id: string) => CriteriaInterface | null; // local
  fetchCriteriaById: (id: string) => Promise<CriteriaInterface | null>; // cloud
  // raw
  allCriteriasCache: CriteriaInterface[]; // optional cache maintained by a background listener (kept small cost)
  //
  createCriteria: (payload: PayloadCreateCriteriaInterface) => Promise<{
    formId: string;
    title: string;
    description: string;
    weight: number;
    id: string;
  }>;
  updateCriteria: (id: string, payload: Partial<Omit<CriteriaInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<CriteriaInterface | null>;
  deleteCriteria: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapCriteria = (data: any): CriteriaInterface => ({
  id: data.id,
  formId: data.form_id,
  title: data.title,
  description: data.description,
  weight: data.weight,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
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

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL CRITERIA CACHE (fetch + Supabase Realtime channel)
  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        const { data, error } = await supabase
          .from('criterias')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('allCriteriasCache fetch error', error);
          if (isMounted) setAllCriteriasCache([]);
          return;
        }

        if (isMounted) setAllCriteriasCache((data ?? []).map(mapCriteria));
      } catch (err) {
        console.error('allCriteriasCache fetch error', err);
        if (isMounted) setAllCriteriasCache([]);
      }
    };

    fetchAll();

    const channel = supabase
      .channel('criterias-cache')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criterias' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      setAllCriteriasCache([]);
    };
  }, []);

  const subscribePage = useCallback(
    async (pageIndex: number) => {
      const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
      if (pageIndex < 1 || pageIndex > max) return;

      // cleanup previous subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setIsLoading(true);

      try {
        const { formId } = paramsRef.current;
        const pageSize = perPageRef.current;
        const from = (pageIndex - 1) * pageSize;
        const to = from + pageSize - 1;

        let q = supabase.from('criterias').select('*', { count: 'exact' });

        if (formId) {
          q = q.eq('form_id', formId);
        }

        q = q.order('created_at', { ascending: false }).range(from, to);

        const { data, error } = await q;

        if (error) {
          console.error('paginate fetch error', error.message);
          setIsLoading(false);
          return;
        }

        console.info('[paginate fetch] page', pageIndex, 'size', (data ?? []).length);
        setCriteriasList((data ?? []).map(mapCriteria));
        setIsLoading(false);
        setPage(pageIndex);
      } catch (err) {
        console.error('subscribePage error', err);
        setIsLoading(false);
      }
    },
    []
  );

  const criterias = useCallback(
    (params?: CriteriasParamsInterface) => {
      const formId = params?.formId ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { formId, limit, perPage };
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
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    setCriteriasList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
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
      const { data, error } = await supabase
        .from('criterias')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();

      if (error || !data) return null;
      return mapCriteria(data);
    } catch (err) {
      console.error('fetchCriteriaById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CREATE CRITERIA
  const createCriteria = useCallback(async (payload: PayloadCreateCriteriaInterface) => {
    try {
      const { data, error } = await supabase
        .from('criterias')
        .insert({
          form_id: payload.formId,
          title: payload.title,
          description: payload.description,
          weight: payload.weight,
        })
        .select()
        .single();

      if (error || !data) throw new Error(error?.message ?? 'Failed to create criteria');

      return {
        id: data.id,
        formId: payload.formId,
        title: payload.title,
        description: payload.description,
        weight: payload.weight,
      };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  // UPDATE CRITERIA
  const updateCriteria = useCallback(
    async (id: string, payload: Partial<Omit<CriteriaInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CriteriaInterface | null> => {
      if (!id) return null;

      try {
        const updateData: Record<string, any> = {};
        if (payload.formId !== undefined) updateData['form_id'] = payload.formId;
        if (payload.title !== undefined) updateData['title'] = payload.title;
        if (payload.description !== undefined) updateData['description'] = payload.description;
        if (payload.weight !== undefined) updateData['weight'] = payload.weight;

        const { data, error } = await supabase
          .from('criterias')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error || !data) return null;

        const updated = mapCriteria(data);

        setAllCriteriasCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setCriteriasList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllCriteriasCache, setCriteriasList]
  );

  // DELETE CRITERIA
  const deleteCriteria = useCallback(
    async (id: string): Promise<boolean> => {
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
    },
    [setAllCriteriasCache, setCriteriasList]
  );

  // CLEANUP ON UNMOUNT
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
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
