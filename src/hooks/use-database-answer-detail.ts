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
import { AnswerDetailInterface, AnswerDetailsParamsInterface, PayloadCreateAnswerDetailInterface } from '/src/interfaces/answer-details';

// ----------------------------------------------------------------------

export interface UseDatabaseAnswerDetailInterface {
  answerDetailsList: AnswerDetailInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  answerDetails: (params?: AnswerDetailsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getAnswerDetailById: (id: string) => AnswerDetailInterface | null; // local
  fetchAnswerDetailById: (id: string) => Promise<AnswerDetailInterface | null>; // cloud
  // raw
  allAnswerDetailsCache: AnswerDetailInterface[]; // optional cache maintained by a background listener (kept small cost)
  //
  createAnswerDetail: (payload: PayloadCreateAnswerDetailInterface) => Promise<{
    questionId: string;
    answerId: string;
    point: number;
    id: string;
  }>;
  updateAnswerDetail: (id: string, payload: Partial<Omit<AnswerDetailInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<AnswerDetailInterface | null>;
  deleteAnswerDetail: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapAnswerDetail = (data: any): AnswerDetailInterface => ({
  id: data.id,
  answerId: data.answerId,
  questionId: data.questionId,
  point: data.point,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseAnswerDetail = (): UseDatabaseAnswerDetailInterface => {
  const [allAnswerDetailsCache, setAllAnswerDetailsCache] = useState<AnswerDetailInterface[]>([]);

  const [answerDetailsList, setAnswerDetailsList] = useState<AnswerDetailInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<AnswerDetailsParamsInterface>({ answerId: '', questionId: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL ANSWER DETAILS CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'answerDetails'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: AnswerDetailInterface[] = [];
        snap.forEach((d) => arr.push(mapAnswerDetail({ id: d.id, ...d.data() })));
        setAllAnswerDetailsCache(arr);
      },
      (err) => {
        console.error('allAnswerDetailsCache snapshot error', err);
        setAllAnswerDetailsCache([]);
      }
    );

    return () => {
      unsub();
      setAllAnswerDetailsCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { answerId, questionId } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'answerDetails');
    const qParts: any[] = [];

    if (answerId) qParts.push(where('answerId', '==', answerId));
    if (questionId) qParts.push(where('questionId', '==', questionId));

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
          const list: AnswerDetailInterface[] = [];
          snap.forEach((d) => {
            list.push(mapAnswerDetail({ id: d.id, ...d.data() }));
          });

          setAnswerDetailsList(list);
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

  const answerDetails = useCallback(
    (params?: AnswerDetailsParamsInterface) => {
      const answerId = params?.answerId ?? '';
      const questionId = params?.questionId ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { answerId, questionId, limit, perPage };
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
    setAnswerDetailsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
  const getAnswerDetailById = useCallback(
    (id: string): AnswerDetailInterface | null => {
      if (!id) return null;
      return allAnswerDetailsCache.find((u) => u.id === id) ?? null;
    },
    [allAnswerDetailsCache]
  );

  const fetchAnswerDetailById = useCallback(async (id: string): Promise<AnswerDetailInterface | null> => {
    if (!id) return null;
    try {
      const q = query(collection(fbFirestore, 'answerDetails'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapAnswerDetail({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error('fetchAnswerDetailById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CRAETE ANSWER DETAILS
  const createAnswerDetail = useCallback(async (payload: PayloadCreateAnswerDetailInterface) => {
    try {
      const docId = uuidv4();

      await setDoc(doc(fbFirestore, 'answerDetails', docId), {
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

  // UPDATE ANSWER DETAILS
  const updateAnswerDetail = useCallback(
    async (id: string, payload: Partial<Omit<AnswerDetailInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<AnswerDetailInterface | null> => {
      if (!id) return null;

      try {
        const docRef = doc(fbFirestore, 'answerDetails', id);
        await updateDoc(docRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapAnswerDetail(snap.data());

        setAllAnswerDetailsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setAnswerDetailsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllAnswerDetailsCache, setAnswerDetailsList]
  );

  // DELETE ANSWER DETAILS
  const deleteAnswerDetail = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      try {
        const docRef = doc(fbFirestore, 'answerDetails', id);
        await deleteDoc(docRef);

        setAllAnswerDetailsCache((prev) => prev.filter((u) => u.id !== id));
        setAnswerDetailsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllAnswerDetailsCache, setAnswerDetailsList]
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
    answerDetailsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    answerDetails,
    nextPage,
    prevPage,
    resetPagination,
    getAnswerDetailById,
    fetchAnswerDetailById,
    createAnswerDetail,
    updateAnswerDetail,
    deleteAnswerDetail,
    allAnswerDetailsCache,
  };
};
