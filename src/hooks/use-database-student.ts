import { useEffect, useState, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  getDocs,
  limit as fbLimit,
  startAfter,
  QueryDocumentSnapshot,
  Timestamp,
  updateDoc,
  serverTimestamp,
  getDoc,
  deleteDoc,
  doc,
  setDoc,
  getCountFromServer,
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
// firebase
import { fbFirestore } from '/src/firebase';
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
  nameLowercase: data.nameLowercase,
  class: data.class,
  identityNumber: data.identityNumber,
  parentId: data.parentId,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
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

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<StudentsParamsInterface>({ class: '', parentId: '', search: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL STUDENT CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'students'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: StudentInterface[] = [];
        snap.forEach((d) => arr.push(mapStudent({ id: d.id, ...d.data() })));
        setAllStudentsCache(arr);
      },
      (err) => {
        console.error('allStudentsCache snapshot error', err);
        setAllStudentsCache([]);
      }
    );

    return () => {
      unsub();
      setAllStudentsCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { class: classFilter, parentId, search } = paramsRef.current;
    const pageSize = perPageRef.current;

    const qParts: any[] = [];

    if (classFilter) {
      qParts.push(where('class', '==', classFilter));
    }

    if (parentId) {
      qParts.push(where('parentId', '==', parentId));
    }

    if (search) {
      const keyword = search.toLowerCase().trim();
      qParts.push(orderBy('nameLowercase'));
      qParts.push(where('nameLowercase', '>=', keyword));
      qParts.push(where('nameLowercase', '<=', keyword + '\uf8ff'));
    } else {
      qParts.push(orderBy('createdAt', 'desc'));
    }

    if (pageIndex > 1) {
      const cursor = cursorsRef.current[pageIndex - 1];
      if (cursor) qParts.push(startAfter(cursor));
    }

    qParts.push(fbLimit(pageSize));

    return query(collection(fbFirestore, 'students'), ...qParts);
  }, []);

  const subscribePage = useCallback(
    (pageIndex: number) => {
      const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
      if (pageIndex < 1 || pageIndex > max) return;

      // cleanup previous subscription
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }

      setIsLoading(true);

      const q = buildQueryForPage(pageIndex);

      const unsub = onSnapshot(
        q,
        (snap) => {
          console.info('[paginate snapshot] page', pageIndex, 'size', snap.size);
          const list: StudentInterface[] = [];
          snap.forEach((d) => {
            list.push(mapStudent({ id: d.id, ...d.data() }));
          });

          setStudentsList(list);
          setIsLoading(false);

          const last = snap.docs[snap.docs.length - 1] ?? null;
          lastVisibleRef.current = last || null;
          cursorsRef.current[pageIndex] = last || null;
        },
        (err) => {
          console.error('paginate snapshot error', err.code, err.message);
          setIsLoading(false);
        }
      );

      unsubscribeRef.current = unsub;
      setPage(pageIndex);
    },
    [buildQueryForPage]
  );

  const fetchTotalCount = useCallback(async () => {
    try {
      const { class: classFilter, parentId, search } = paramsRef.current;

      const constraints: any[] = [];

      if (classFilter) {
        constraints.push(where('class', '==', classFilter));
      }

      if (parentId) {
        constraints.push(where('parentId', '==', parentId));
      }

      if (search) {
        const keyword = search.toLowerCase().trim();
        constraints.push(orderBy('nameLowercase'));
        constraints.push(where('nameLowercase', '>=', keyword));
        constraints.push(where('nameLowercase', '<=', keyword + '\uf8ff'));
      }

      const q = query(collection(fbFirestore, 'students'), ...constraints);

      const countSnap = await getCountFromServer(q);
      const total = Number(countSnap.data().count ?? 0);

      setTotalCount(total);
    } catch (err) {
      console.error('fetchTotalCount error', err);
      setTotalCount(0);
    }
  }, []);

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

      cursorsRef.current = [null];
      lastVisibleRef.current = null;

      fetchTotalCount();

      subscribePage(1);
    },
    [fetchTotalCount, subscribePage]
  );

  const nextPage = useCallback(() => {
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
    if (page >= max) return;
    const cursorForNext = cursorsRef.current[page];
    if (!cursorForNext) {
      subscribePage(page + 1);
    } else {
      subscribePage(page + 1);
    }
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

    cursorsRef.current = [null];
    lastVisibleRef.current = null;
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
      const q = query(collection(fbFirestore, 'students'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapStudent({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error('fetchStudentById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CRAETE STUDENT
  const createStudent = useCallback(async (payload: PayloadCreateStudentInterface) => {
    try {
      const sanitizedIdentityNumber = payload.identityNumber.trim();
      const sanitizedParentId = (payload.parentId ?? '').trim();

      const duplicateIdentityQuery = query(collection(fbFirestore, 'students'), where('identityNumber', '==', sanitizedIdentityNumber), fbLimit(1));
      const duplicateIdentitySnapshot = await getDocs(duplicateIdentityQuery);

      if (!duplicateIdentitySnapshot.empty) {
        throw new Error('NIS sudah terdaftar');
      }

      const docId = uuidv4();

      await setDoc(doc(fbFirestore, 'students', docId), {
        id: docId,
        ...payload,
        identityNumber: sanitizedIdentityNumber,
        parentId: sanitizedParentId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
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
          const duplicateIdentityQuery = query(collection(fbFirestore, 'students'), where('identityNumber', '==', sanitizedPayload.identityNumber), fbLimit(2));
          const duplicateIdentitySnapshot = await getDocs(duplicateIdentityQuery);
          const duplicateIdentityExists = duplicateIdentitySnapshot.docs.some((snapshotDoc) => snapshotDoc.id !== id);

          if (duplicateIdentityExists) {
            throw new Error('NIS sudah terdaftar');
          }
        }

        const docRef = doc(fbFirestore, 'students', id);
        await updateDoc(docRef, {
          ...sanitizedPayload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapStudent(snap.data());

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
        const docRef = doc(fbFirestore, 'students', id);
        await deleteDoc(docRef);

        setAllStudentsCache((prev) => prev.filter((u) => u.id !== id));
        setStudentsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllStudentsCache, setStudentsList]
  );

  // CLEANUP ON UNMONT
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
