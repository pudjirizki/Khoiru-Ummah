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
import { AnswerInterface, AnswersParamsInterface, PayloadCreateAnswerInterface } from '/src/interfaces/answer';

// ----------------------------------------------------------------------

export interface UseDatabaseAnswerInterface {
  answersList: AnswerInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  answers: (params?: AnswersParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getAnswerById: (id: string) => AnswerInterface | null; // local
  fetchAnswerById: (id: string) => Promise<AnswerInterface | null>; // cloud
  // raw
  allAnswersCache: AnswerInterface[]; // optional cache maintained by a background listener (kept small cost)
  //
  createAnswer: (payload: PayloadCreateAnswerInterface) => Promise<{
    criteriaId: string;
    assessmentId: string;
    averagePoint: number;
    id: string;
  }>;
  updateAnswer: (id: string, payload: Partial<Omit<AnswerInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<AnswerInterface | null>;
  deleteAnswer: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapAnswer = (data: any): AnswerInterface => ({
  id: data.id,
  assessmentId: data.assessmentId,
  criteriaId: data.criteriaId,
  averagePoint: data.averagePoint,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseAnswer = (): UseDatabaseAnswerInterface => {
  const [allAnswersCache, setAllAnswersCache] = useState<AnswerInterface[]>([]);

  const [answersList, setAnswersList] = useState<AnswerInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<AnswersParamsInterface>({ assessmentId: '', criteriaId: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL ANSWERS CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'answers'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: AnswerInterface[] = [];
        snap.forEach((d) => arr.push(mapAnswer({ id: d.id, ...d.data() })));
        setAllAnswersCache(arr);
      },
      (err) => {
        console.error('allAnswersCache snapshot error', err);
        setAllAnswersCache([]);
      }
    );

    return () => {
      unsub();
      setAllAnswersCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { assessmentId, criteriaId } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'answers');
    const qParts: any[] = [];

    if (assessmentId) qParts.push(where('assessmentId', '==', assessmentId));
    if (criteriaId) qParts.push(where('criteriaId', '==', criteriaId));

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
          const list: AnswerInterface[] = [];
          snap.forEach((d) => {
            list.push(mapAnswer({ id: d.id, ...d.data() }));
          });

          setAnswersList(list);
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

  const answers = useCallback(
    (params?: AnswersParamsInterface) => {
      const assessmentId = params?.assessmentId ?? '';
      const criteriaId = params?.criteriaId ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { assessmentId, criteriaId, limit, perPage };
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
    setAnswersList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
  const getAnswerById = useCallback(
    (id: string): AnswerInterface | null => {
      if (!id) return null;
      return allAnswersCache.find((u) => u.id === id) ?? null;
    },
    [allAnswersCache]
  );

  const fetchAnswerById = useCallback(async (id: string): Promise<AnswerInterface | null> => {
    if (!id) return null;
    try {
      const q = query(collection(fbFirestore, 'answers'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapAnswer({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error('fetchAnswerById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CRAETE ANSWERS
  const createAnswer = useCallback(async (payload: PayloadCreateAnswerInterface) => {
    try {
      const docId = uuidv4();

      await setDoc(doc(fbFirestore, 'answers', docId), {
        id: docId,
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return {
        id: docId,
        ...payload,
      };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  // UPDATE ANSWERS
  const updateAnswer = useCallback(
    async (id: string, payload: Partial<Omit<AnswerInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnswerInterface | null> => {
      if (!id) return null;

      try {
        const docRef = doc(fbFirestore, 'answers', id);
        await updateDoc(docRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapAnswer(snap.data());

        setAllAnswersCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setAnswersList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllAnswersCache, setAnswersList]
  );

  // DELETE ANSWERS
  const deleteAnswer = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      try {
        const docRef = doc(fbFirestore, 'answers', id);
        await deleteDoc(docRef);

        setAllAnswersCache((prev) => prev.filter((u) => u.id !== id));
        setAnswersList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllAnswersCache, setAnswersList]
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
    answersList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    answers,
    nextPage,
    prevPage,
    resetPagination,
    getAnswerById,
    fetchAnswerById,
    createAnswer,
    updateAnswer,
    deleteAnswer,
    allAnswersCache,
  };
};
