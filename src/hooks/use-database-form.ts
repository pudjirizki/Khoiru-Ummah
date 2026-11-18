import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/supabase';
// interfaces
import { FormInterface, FormsParamsInterface, PayloadCreateFormInterface } from '/src/interfaces/form';

// ----------------------------------------------------------------------

export interface UseDatabaseFormInterface {
  formsList: FormInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  forms: (params?: FormsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getFormById: (id: string) => FormInterface | null; // local
  fetchFormById: (id: string) => Promise<FormInterface | null>; // cloud
  // raw
  allFormsCache: FormInterface[]; // optional cache maintained by a background listener (kept small cost)
  //
  createForm: (payload: PayloadCreateFormInterface) => Promise<{
    createdBy: string;
    title: string;
    class: string[];
    description: string;
    notes: string;
    id: string;
  }>;
  updateForm: (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<FormInterface | null>;
  deleteForm: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapForm = (data: any): FormInterface => ({
  id: data.id,
  createdBy: data.created_by,
  title: data.title,
  class: data.class,
  description: data.description,
  notes: data.notes,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
});

// ----------------------------------------------------------------------

export const useDatabaseForm = (): UseDatabaseFormInterface => {
  const [allFormsCache, setAllFormsCache] = useState<FormInterface[]>([]);

  const [formsList, setFormsList] = useState<FormInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const paramsRef = useRef<FormsParamsInterface>({ class: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL FORM CACHE (fetch + Supabase Realtime channel)
  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('allFormsCache fetch error', error);
          if (isMounted) setAllFormsCache([]);
          return;
        }

        if (isMounted) setAllFormsCache((data ?? []).map(mapForm));
      } catch (err) {
        console.error('allFormsCache fetch error', err);
        if (isMounted) setAllFormsCache([]);
      }
    };

    fetchAll();

    const channel = supabase
      .channel('forms-cache')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forms' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      setAllFormsCache([]);
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
        const { class: classFilter } = paramsRef.current;
        const pageSize = perPageRef.current;
        const from = (pageIndex - 1) * pageSize;
        const to = from + pageSize - 1;

        let q = supabase.from('forms').select('*', { count: 'exact' });

        if (classFilter) {
          q = q.contains('class', [classFilter]);
        }

        q = q.order('created_at', { ascending: false }).range(from, to);

        const { data, error } = await q;

        if (error) {
          console.error('paginate fetch error', error.message);
          setIsLoading(false);
          return;
        }

        console.info('[paginate fetch] page', pageIndex, 'size', (data ?? []).length);
        setFormsList((data ?? []).map(mapForm));
        setIsLoading(false);
        setPage(pageIndex);
      } catch (err) {
        console.error('subscribePage error', err);
        setIsLoading(false);
      }
    },
    []
  );

  const forms = useCallback(
    (params?: FormsParamsInterface) => {
      const classFilter = params?.class ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { class: classFilter, limit, perPage };
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

    setFormsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
  const getFormById = useCallback(
    (id: string): FormInterface | null => {
      if (!id) return null;
      return allFormsCache.find((u) => u.id === id) ?? null;
    },
    [allFormsCache]
  );

  const fetchFormById = useCallback(async (id: string): Promise<FormInterface | null> => {
    if (!id) return null;
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();

      if (error || !data) return null;
      return mapForm(data);
    } catch (err) {
      console.error('fetchFormById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CREATE FORM
  const createForm = useCallback(async (payload: PayloadCreateFormInterface) => {
    try {
      const { data, error } = await supabase
        .from('forms')
        .insert({
          created_by: payload.createdBy,
          title: payload.title,
          class: payload.class,
          description: payload.description,
          notes: payload.notes,
        })
        .select()
        .single();

      if (error || !data) throw new Error(error?.message ?? 'Failed to create form');

      return {
        id: data.id,
        createdBy: payload.createdBy,
        title: payload.title,
        class: payload.class,
        description: payload.description,
        notes: payload.notes,
      };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  // UPDATE FORM
  const updateForm = useCallback(
    async (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FormInterface | null> => {
      if (!id) return null;

      try {
        const updateData: Record<string, any> = {};
        if (payload.createdBy !== undefined) updateData['created_by'] = payload.createdBy;
        if (payload.title !== undefined) updateData['title'] = payload.title;
        if (payload.class !== undefined) updateData['class'] = payload.class;
        if (payload.description !== undefined) updateData['description'] = payload.description;
        if (payload.notes !== undefined) updateData['notes'] = payload.notes;

        const { data, error } = await supabase
          .from('forms')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error || !data) return null;

        const updated = mapForm(data);

        setAllFormsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setFormsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllFormsCache, setFormsList]
  );

  // DELETE FORM
  const deleteForm = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      try {
        const { error } = await supabase.from('forms').delete().eq('id', id);

        if (error) throw new Error(error.message);

        setAllFormsCache((prev) => prev.filter((u) => u.id !== id));
        setFormsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllFormsCache, setFormsList]
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
    formsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    forms,
    nextPage,
    prevPage,
    resetPagination,
    getFormById,
    fetchFormById,
    createForm,
    updateForm,
    deleteForm,
    allFormsCache,
  };
};
