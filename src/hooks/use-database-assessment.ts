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
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
// firebase
import { fbFirestore } from '/src/firebase';
// interfaces
import { AssessmentInterface, AssessmentsParamsInterface, PayloadCreateAssessmentInterface } from '/src/interfaces/assessment';

// ----------------------------------------------------------------------

export interface UseDatabaseAssessmentInterface {
  assessmentsList: AssessmentInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  assessments: (params?: AssessmentsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getAssessmentById: (id: string) => AssessmentInterface | null; // local
  fetchAssessmentById: (id: string) => Promise<AssessmentInterface | null>; // cloud
  // raw
  allAssessmentsCache: AssessmentInterface[]; // optional cache maintained by a background listener (kept small cost)
  //
  createAssessment: (payload: PayloadCreateAssessmentInterface) => Promise<{
    formId: string;
    studenId: string;
    userId: string;
    score: number;
    id: string;
  }>;
  updateAssessment: (id: string, payload: Partial<Omit<AssessmentInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<AssessmentInterface | null>;
  deleteAssessment: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapAssessment = (data: any): AssessmentInterface => ({
  id: data.id,
  formId: data.formId,
  studenId: data.studenId,
  studentClass: data.studentClass,
  catatan: data.catatan,
  userId: data.userId,
  score: data.score,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseAssessment = (): UseDatabaseAssessmentInterface => {
  const [allAssessmentsCache, setAllAssessmentsCache] = useState<AssessmentInterface[]>([]);

  const [assessmentsList, setAssessmentsList] = useState<AssessmentInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<AssessmentsParamsInterface>({ formId: '', userId: '', studentId: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL ASSESSMENTS CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'assessments'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: AssessmentInterface[] = [];
        snap.forEach((d) => arr.push(mapAssessment({ id: d.id, ...d.data() })));
        setAllAssessmentsCache(arr);
      },
      (err) => {
        console.error('allAssessmentsCache snapshot error', err);
        setAllAssessmentsCache([]);
      }
    );

    return () => {
      unsub();
      setAllAssessmentsCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { formId, userId, studentId } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'assessments');
    const qParts: any[] = [];

    if (formId) qParts.push(where('formId', '==', formId));
    if (userId) qParts.push(where('userId', '==', userId));
    if (studentId) qParts.push(where('studentId', '==', studentId));

    qParts.push(orderBy('createdAt', 'desc'));

    if (pageIndex > 1) {
      const cursor = cursorsRef.current[pageIndex - 1] ?? null;
      if (cursor) {
        qParts.push(startAfter(cursor));
      }
    }

    qParts.push(fbLimit(pageSize));

    return query(collectionRef, ...qParts);
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
          const list: AssessmentInterface[] = [];
          snap.forEach((d) => {
            list.push(mapAssessment({ id: d.id, ...d.data() }));
          });

          setAssessmentsList(list);
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

  const assessments = useCallback(
    (params?: AssessmentsParamsInterface) => {
      const formId = params?.formId ?? '';
      const userId = params?.userId ?? '';
      const studentId = params?.studentId ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { formId, userId, studentId, limit, perPage };
      limitRef.current = limit;
      perPageRef.current = perPage;

      cursorsRef.current = [null];
      lastVisibleRef.current = null;

      subscribePage(1);
    },
    [subscribePage]
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
    setAssessmentsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
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
      const q = query(collection(fbFirestore, 'assessments'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapAssessment({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error('fetchAssessmentById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CRAETE ASSESSMENTS
  const createAssessment = useCallback(async (payload: PayloadCreateAssessmentInterface) => {
    try {
      const docId = uuidv4();
      const catatan = typeof payload.catatan === 'string' ? payload.catatan.trim() : '';

      await setDoc(doc(fbFirestore, 'assessments', docId), {
        id: docId,
        ...payload,
        catatan,
        studentClass: payload.studentClass ?? '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: docId,
        ...payload,
        catatan,
      };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  // UPDATE ASSESSMENTS
  const updateAssessment = useCallback(
    async (id: string, payload: Partial<Omit<AssessmentInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AssessmentInterface | null> => {
      if (!id) return null;

      try {
        const docRef = doc(fbFirestore, 'assessments', id);
        await updateDoc(docRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapAssessment(snap.data());

        setAllAssessmentsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setAssessmentsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllAssessmentsCache, setAssessmentsList]
  );

  // DELETE ASSESSMENTS
  const deleteAssessment = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      try {
        const docRef = doc(fbFirestore, 'assessments', id);
        await deleteDoc(docRef);

        setAllAssessmentsCache((prev) => prev.filter((u) => u.id !== id));
        setAssessmentsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllAssessmentsCache, setAssessmentsList]
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
