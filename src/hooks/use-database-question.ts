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
import { QuestionInterface, PayloadCreateQuestionInterface, QuestionsParamsInterface } from '/src/interfaces/question';

// ----------------------------------------------------------------------

export interface UseDatabaseQuestionInterface {
  questionsList: QuestionInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  questions: (params?: QuestionsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getQuestionById: (id: string) => QuestionInterface | null; // local
  fetchQuestionById: (id: string) => Promise<QuestionInterface | null>; // cloud
  // raw
  allQuestionsCache: QuestionInterface[]; // optional cache maintained by a background listener (kept small cost)
  //
  createQuestion: (payload: PayloadCreateQuestionInterface) => Promise<{
    criteriaId: string;
    order: number;
    text: string;
    id: string;
  }>;
  updateQuestion: (id: string, payload: Partial<Omit<QuestionInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<QuestionInterface | null>;
  deleteQuestion: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapQuestion = (data: any): QuestionInterface => ({
  id: data.id,
  criteriaId: data.criteriaId,
  order: data.order,
  text: data.text,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseQuestion = (): UseDatabaseQuestionInterface => {
  const [allQuestionsCache, setAllQuestionsCache] = useState<QuestionInterface[]>([]);

  const [questionsList, setQuestionsList] = useState<QuestionInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<QuestionsParamsInterface>({ criteriaId: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL QUESTION CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'questions'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: QuestionInterface[] = [];
        snap.forEach((d) => arr.push(mapQuestion({ id: d.id, ...d.data() })));
        setAllQuestionsCache(arr);
      },
      (err) => {
        console.error('allQuestionsCache snapshot error', err);
        setAllQuestionsCache([]);
      }
    );

    return () => {
      unsub();
      setAllQuestionsCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { criteriaId } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'questions');
    const qParts: any[] = [];

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
          const list: QuestionInterface[] = [];
          snap.forEach((d) => {
            list.push(mapQuestion({ id: d.id, ...d.data() }));
          });

          setQuestionsList(list);
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

  const questions = useCallback(
    (params?: QuestionsParamsInterface) => {
      const criteriaId = params?.criteriaId ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { criteriaId, limit, perPage };
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
    setQuestionsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
  const getQuestionById = useCallback(
    (id: string): QuestionInterface | null => {
      if (!id) return null;
      return allQuestionsCache.find((u) => u.id === id) ?? null;
    },
    [allQuestionsCache]
  );

  const fetchQuestionById = useCallback(async (id: string): Promise<QuestionInterface | null> => {
    if (!id) return null;
    try {
      const q = query(collection(fbFirestore, 'questions'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapQuestion({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error('fetchQuestionById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CRAETE QUESTION
  const createQuestion = useCallback(async (payload: PayloadCreateQuestionInterface) => {
    try {
      const docId = uuidv4();

      await setDoc(doc(fbFirestore, 'questions', docId), {
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

  // UPDATE QUESTION
  const updateQuestion = useCallback(
    async (id: string, payload: Partial<Omit<QuestionInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<QuestionInterface | null> => {
      if (!id) return null;

      try {
        const docRef = doc(fbFirestore, 'questions', id);
        await updateDoc(docRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapQuestion(snap.data());

        setAllQuestionsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setQuestionsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllQuestionsCache, setQuestionsList]
  );

  // DELETE QUESTION
  const deleteQuestion = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      try {
        const docRef = doc(fbFirestore, 'questions', id);
        await deleteDoc(docRef);

        setAllQuestionsCache((prev) => prev.filter((u) => u.id !== id));
        setQuestionsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllQuestionsCache, setQuestionsList]
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
    questionsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    questions,
    nextPage,
    prevPage,
    resetPagination,
    getQuestionById,
    fetchQuestionById,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    allQuestionsCache,
  };
};
