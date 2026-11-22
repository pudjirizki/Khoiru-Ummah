import { useEffect, useState, useCallback, useRef } from 'react';
// supabase
import { supabase } from '/src/supabase';
import { subscribeToTableChanges } from '/src/supabase/realtime';
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
  getStudentById: (id: string) => StudentInterface | null; // local
  fetchStudentById: (id: string) => Promise<StudentInterface | null>; // cloud
  // raw
  allStudentsCache: StudentInterface[]; // optional cache maintained by a background listener (kept small cost)
  //
  createStudent: (payload: PayloadCreateStudentInterface) => Promise<void>;
  updateStudent: (id: string, payload: Partial<Omit<StudentInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<StudentInterface | null>;
  deleteStudent: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapStudent = (data: any): StudentInterface => ({
  id: data.id,
  name: data.name,
  nameLowercase: data.name_lowercase,
  class: data.class,
  identityNumber: data.identity_number,
  parentId: data.parent_id,
  createdAt: new Date(data.created_at),
  updatedAt: new Date(data.updated_at),
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

  // ALL STUDENT CACHE (fetch + Supabase Realtime channel)
  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) {
          console.error('allStudentsCache fetch error', error);
          if (isMounted) setAllStudentsCache([]);
          return;
        }

        if (isMounted) setAllStudentsCache((data ?? []).map(mapStudent));
      } catch (err) {
        console.error('allStudentsCache fetch error', err);
        if (isMounted) setAllStudentsCache([]);
      }
    };

    fetchAll();

    const unsubscribe = subscribeToTableChanges('students', fetchAll);

    return () => {
      isMounted = false;
      unsubscribe();
      setAllStudentsCache([]);
    };
  }, []);

  const fetchTotalCount = useCallback(async () => {
    try {
      const { class: classFilter, parentId, search } = paramsRef.current;

      let countQuery = supabase.from('students').select('*', { count: 'exact', head: true });

      if (classFilter) {
        countQuery = countQuery.eq('class', classFilter);
      }

      if (parentId) {
        countQuery = countQuery.eq('parent_id', parentId);
      }

      if (search) {
        const keyword = search.toLowerCase().trim();
        countQuery = countQuery.ilike('name', `%${keyword}%`);
      }

      const { count, error } = await countQuery;

      if (error) {
        console.error('fetchTotalCount error', error);
        setTotalCount(0);
        return;
      }

      setTotalCount(count ?? 0);
    } catch (err) {
      console.error('fetchTotalCount error', err);
      setTotalCount(0);
    }
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
        const { class: classFilter, parentId, search } = paramsRef.current;
        const pageSize = perPageRef.current;
        const from = (pageIndex - 1) * pageSize;
        const to = from + pageSize - 1;

        let q = supabase.from('students').select('*', { count: 'exact' });

        if (classFilter) {
          q = q.eq('class', classFilter);
        }

        if (parentId) {
          q = q.eq('parent_id', parentId);
        }

        if (search) {
          const keyword = search.toLowerCase().trim();
          q = q.ilike('name', `%${keyword}%`);
        }

        q = q.order('created_at', { ascending: false }).range(from, to);

        const { data, count, error } = await q;

        if (error) {
          console.error('paginate fetch error', error.message);
          setIsLoading(false);
          return;
        }

        console.info('[paginate fetch] page', pageIndex, 'size', (data ?? []).length);
        setStudentsList((data ?? []).map(mapStudent));
        if (count !== null) setTotalCount(count);
        setIsLoading(false);
        setPage(pageIndex);
      } catch (err) {
        console.error('subscribePage error', err);
        setIsLoading(false);
      }
    },
    []
  );

  const students = useCallback(
    (params?: StudentsParamsInterface) => {
      const classFilter = params?.class ?? '';
      const parentId = params?.parentId ?? '';
      const search = params?.search ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { class: classFilter, parentId, search, limit, perPage };
      limitRef.current = limit;
      perPageRef.current = perPage;

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
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

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
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .limit(1)
        .single();

      if (error || !data) return null;
      return mapStudent(data);
    } catch (err) {
      console.error('fetchStudentById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CREATE STUDENT
  const createStudent = useCallback(async (payload: PayloadCreateStudentInterface) => {
    try {
      const sanitizedIdentityNumber = payload.identityNumber.trim();
      const sanitizedParentId = (payload.parentId ?? '').trim();

      const { data: duplicateData, error: duplicateError } = await supabase
        .from('students')
        .select('id')
        .eq('identity_number', sanitizedIdentityNumber)
        .limit(1);

      if (duplicateError) throw new Error(duplicateError.message);

      if (duplicateData && duplicateData.length > 0) {
        throw new Error('NIS sudah terdaftar');
      }

      const { error } = await supabase.from('students').insert({
        name: payload.name,
        name_lowercase: payload.nameLowercase,
        class: payload.class,
        identity_number: sanitizedIdentityNumber,
        parent_id: sanitizedParentId,
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
        const sanitizedPayload = { ...payload };

        if (typeof sanitizedPayload.identityNumber === 'string') {
          sanitizedPayload.identityNumber = sanitizedPayload.identityNumber.trim();
        }

        if (typeof sanitizedPayload.parentId === 'string') {
          sanitizedPayload.parentId = sanitizedPayload.parentId.trim();
        }

        if (sanitizedPayload.identityNumber) {
          const { data: duplicateData, error: duplicateError } = await supabase
            .from('students')
            .select('id')
            .eq('identity_number', sanitizedPayload.identityNumber)
            .neq('id', id)
            .limit(1);

          if (duplicateError) throw new Error(duplicateError.message);

          if (duplicateData && duplicateData.length > 0) {
            throw new Error('NIS sudah terdaftar');
          }
        }

        const updateData: Record<string, any> = {};
        if (sanitizedPayload.name !== undefined) updateData['name'] = sanitizedPayload.name;
        if (sanitizedPayload.nameLowercase !== undefined) updateData['name_lowercase'] = sanitizedPayload.nameLowercase;
        if (sanitizedPayload.class !== undefined) updateData['class'] = sanitizedPayload.class;
        if (sanitizedPayload.identityNumber !== undefined) updateData['identity_number'] = sanitizedPayload.identityNumber;
        if (sanitizedPayload.parentId !== undefined) updateData['parent_id'] = sanitizedPayload.parentId;

        const { data, error } = await supabase
          .from('students')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (error || !data) return null;

        const updated = mapStudent(data);

        setAllStudentsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setStudentsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllStudentsCache, setStudentsList]
  );

  // DELETE STUDENT
  const deleteStudent = useCallback(
    async (id: string): Promise<boolean> => {
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
    },
    [setAllStudentsCache, setStudentsList]
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

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));

  const hasNext = page < maxPages;

  const hasPrev = page > 1;

  return {
    studentsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
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
