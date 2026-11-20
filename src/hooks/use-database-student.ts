import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { PayloadCreateStudentInterface, StudentInterface, StudentsParamsInterface } from '/src/interfaces/student';

// ----------------------------------------------------------------------

export interface UseDatabaseStudentInterface {
  studentsList: StudentInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalCount: number;
  // controls
  students: (params?: StudentsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  subscribePage: (pageIndex: number) => void;
  // helpers
  getStudentById: (id: string) => StudentInterface | null;
  fetchStudentById: (id: string) => Promise<StudentInterface | null>;
  // raw
  allStudentsCache: StudentInterface[];
  //
  createStudent: (payload: PayloadCreateStudentInterface) => Promise<void>;
  updateStudent: (id: string, payload: Partial<Omit<StudentInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<StudentInterface | null>;
  deleteStudent: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapStudent = (data: any): StudentInterface => ({
  id: data.id,
  name: data.name,
  nameLowercase: data.name_lowercase ?? data.nameLowercase,
  class: data.class,
  identityNumber: data.identity_number ?? data.identityNumber,
  parentId: data.parent_id ?? data.parentId,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseStudent = (): UseDatabaseStudentInterface => {
  const [allStudentsCache, setAllStudentsCache] = useState<StudentInterface[]>([]);
  const [studentsList, setStudentsList] = useState<StudentInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<StudentsParamsInterface>({ class: '', parentId: '', search: '', limit: 50, perPage: 5 });
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL STUDENT CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('students').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) {
        setAllStudentsCache(data.map(mapStudent));
      }
    };

    fetchAll();

    // Realtime
    const channel = supabase
      .channel(`students-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, () => {
        fetchAll();
      })
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllStudentsCache([]);
    };
  }, []);

  const fetchTotalCount = useCallback(async () => {
    try {
      const { class: classFilter, parentId, search } = paramsRef.current;

      let q = supabase.from('students').select('*', { count: 'exact', head: true });

      if (classFilter) q = q.eq('class', classFilter);
      if (parentId) q = q.eq('parent_id', parentId);
      if (search) {
        const keyword = search.toLowerCase().trim();
        q = q.gte('name_lowercase', keyword).lte('name_lowercase', keyword + '\uf8ff');
      }

      const { count } = await q;
      setTotalCount(count ?? 0);
    } catch {
      setTotalCount(0);
    }
  }, []);

  const subscribePage = useCallback(
    async (pageIndex: number) => {
      const perPage = perPageRef.current;
      const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
      if (pageIndex < 1 || pageIndex > max) return;

      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setIsLoading(true);

      try {
        const { class: classFilter, parentId, search } = paramsRef.current;
        const from = (pageIndex - 1) * perPage;
        const to = from + perPage - 1;

        let q = supabase.from('students').select('*');

        if (classFilter) q = q.eq('class', classFilter);
        if (parentId) q = q.eq('parent_id', parentId);
        if (search) {
          const keyword = search.toLowerCase().trim();
          q = q.gte('name_lowercase', keyword).lte('name_lowercase', keyword + '\uf8ff').order('name_lowercase');
        } else {
          q = q.order('created_at', { ascending: false });
        }

        q = q.range(from, to);

        const { data } = await q;
        setStudentsList((data ?? []).map(mapStudent));
      } finally {
        setIsLoading(false);
      }

      setPage(pageIndex);
    },
    []
  );

  const students = useCallback(
    (params?: StudentsParamsInterface) => {
      paramsRef.current = {
        class: params?.class ?? '',
        parentId: params?.parentId ?? '',
        search: params?.search ?? '',
        limit: params?.limit ?? 50,
        perPage: params?.perPage ?? 5,
      };
      limitRef.current = params?.limit ?? 50;
      perPageRef.current = params?.perPage ?? 5;

      fetchTotalCount();
      subscribePage(1);
    },
    [fetchTotalCount, subscribePage]
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
    setStudentsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
  const getStudentById = useCallback(
    (id: string): StudentInterface | null => {
      if (!id) return null;
      return allStudentsCache.find((u) => u.id === id) ?? null;
    },
    [allStudentsCache]
  );

  const fetchStudentById = useCallback(async (id: string): Promise<StudentInterface | null> => {
    if (!id) return null;
    try {
      const { data } = await supabase.from('students').select('*').eq('id', id).limit(1).single();
      return data ? mapStudent(data) : null;
    } catch {
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CREATE STUDENT
  const createStudent = useCallback(async (payload: PayloadCreateStudentInterface) => {
    try {
      const sanitizedIdentityNumber = payload.identityNumber.trim();
      const sanitizedParentId = (payload.parentId ?? '').trim();

      const { data: existing } = await supabase
        .from('students')
        .select('id')
        .eq('identity_number', sanitizedIdentityNumber)
        .limit(1);

      if (existing && existing.length > 0) {
        throw new Error('NIS sudah terdaftar');
      }

      const docId = uuidv4();
      const now = new Date().toISOString();

      const { error } = await supabase.from('students').insert({
        id: docId,
        name: payload.name,
        name_lowercase: (payload.nameLowercase ?? payload.name).toLowerCase(),
        class: payload.class,
        identity_number: sanitizedIdentityNumber,
        parent_id: sanitizedParentId || null,
        created_at: now,
        updated_at: now,
      });

      if (error) throw new Error(error.message);
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  // UPDATE STUDENT
  const updateStudent = useCallback(
    async (id: string, payload: Partial<Omit<StudentInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<StudentInterface | null> => {
      if (!id) return null;

      try {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

        if (payload.name !== undefined) updateData.name = payload.name;
        if (payload.nameLowercase !== undefined) updateData.name_lowercase = payload.nameLowercase;
        if (payload.class !== undefined) updateData.class = payload.class;
        if (payload.identityNumber !== undefined) {
          const sanitized = payload.identityNumber.trim();
          const { data: existing } = await supabase.from('students').select('id').eq('identity_number', sanitized).neq('id', id).limit(1);
          if (existing && existing.length > 0) throw new Error('NIS sudah terdaftar');
          updateData.identity_number = sanitized;
        }
        if (payload.parentId !== undefined) updateData.parent_id = payload.parentId?.trim() || null;

        const { data, error } = await supabase.from('students').update(updateData).eq('id', id).select().single();

        if (error) throw new Error(error.message);

        const updated = mapStudent(data);
        setAllStudentsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setStudentsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    []
  );

  // DELETE STUDENT
  const deleteStudent = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('students').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setAllStudentsCache((prev) => prev.filter((u) => u.id !== id));
      setStudentsList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) {
      throw safeWrapError(err);
    }
  }, []);

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  return {
    studentsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages,
    hasNext,
    hasPrev,
    students,
    nextPage,
    prevPage,
    resetPagination,
    subscribePage,
    getStudentById,
    fetchStudentById,
    createStudent,
    updateStudent,
    deleteStudent,
    allStudentsCache,
    totalCount,
  };
};
