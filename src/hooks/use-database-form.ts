import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { FormInterface, FormsParamsInterface, PayloadCreateFormInterface } from '/src/interfaces/form';

// ----------------------------------------------------------------------

export interface UseDatabaseFormInterface {
  formsList: FormInterface[];
  isLoading: boolean;
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  forms: (params?: FormsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getFormById: (id: string) => FormInterface | null;
  fetchFormById: (id: string) => Promise<FormInterface | null>;
  allFormsCache: FormInterface[];
  createForm: (payload: PayloadCreateFormInterface) => Promise<{ createdBy: string; title: string; class: string[]; description: string; notes: string; id: string }>;
  updateForm: (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<FormInterface | null>;
  deleteForm: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapForm = (data: any): FormInterface => ({
  id: data.id,
  createdBy: data.created_by ?? data.createdBy,
  title: data.title,
  class: data.class,
  description: data.description,
  notes: data.notes,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
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

  // ALL FORMS CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('forms').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) setAllFormsCache(data.map(mapForm));
    };

    fetchAll();

    const channel = supabase
      .channel(`forms-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'forms' }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllFormsCache([]);
    };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);

    try {
      const { class: classFilter } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('forms').select('*').order('created_at', { ascending: false });

      if (classFilter) {
        q = q.contains('class', [classFilter]);
      }

      q = q.range(from, to);

      const { data } = await q;
      setFormsList((data ?? []).map(mapForm));
    } finally {
      setIsLoading(false);
    }

    setPage(pageIndex);
  }, []);

  const forms = useCallback(
    (params?: FormsParamsInterface) => {
      paramsRef.current = { class: params?.class ?? '', limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
      limitRef.current = params?.limit ?? 50;
      perPageRef.current = params?.perPage ?? 5;
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
    setFormsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

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
      const { data } = await supabase.from('forms').select('*').eq('id', id).limit(1).single();
      return data ? mapForm(data) : null;
    } catch {
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CREATE FORM
  const createForm = useCallback(async (payload: PayloadCreateFormInterface) => {
    try {
      const docId = uuidv4();
      const now = new Date().toISOString();

      const { error } = await supabase.from('forms').insert({
        id: docId,
        created_by: payload.createdBy,
        title: payload.title,
        class: payload.class,
        description: payload.description,
        notes: payload.notes,
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);

      return { id: docId, ...payload };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  // UPDATE FORM
  const updateForm = useCallback(
    async (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FormInterface | null> => {
      if (!id) return null;
      try {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.createdBy !== undefined) updateData.created_by = payload.createdBy;
        if (payload.title !== undefined) updateData.title = payload.title;
        if (payload.class !== undefined) updateData.class = payload.class;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.notes !== undefined) updateData.notes = payload.notes;

        const { data, error } = await supabase.from('forms').update(updateData).eq('id', id).select().single();
        if (error) throw new Error(error.message);

        const updated = mapForm(data);
        setAllFormsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setFormsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    []
  );

  // DELETE FORM
  const deleteForm = useCallback(async (id: string): Promise<boolean> => {
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
