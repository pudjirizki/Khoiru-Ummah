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
  formId: data.formId,
  title: data.title,
  description: data.description,
  weight: data.weight,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseCriteria = (): UseDatabaseCriteriaInterface => {
  const [allCriteriasCache, setAllCriteriasCache] = useState<CriteriaInterface[]>([]);

  const [criteriasList, setCriteriasList] = useState<CriteriaInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<CriteriasParamsInterface>({ formId: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL CRITERIA CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'criterias'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: CriteriaInterface[] = [];
        snap.forEach((d) => arr.push(mapCriteria({ id: d.id, ...d.data() })));
        setAllCriteriasCache(arr);
      },
      (err) => {
        console.error('allCriteriasCache snapshot error', err);
        setAllCriteriasCache([]);
      }
    );

    return () => {
      unsub();
      setAllCriteriasCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { formId } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'criterias');
    const qParts: any[] = [];

    if (formId) qParts.push(where('formId', '==', formId));

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
          const list: CriteriaInterface[] = [];
          snap.forEach((d) => {
            list.push(mapCriteria({ id: d.id, ...d.data() }));
          });

          setCriteriasList(list);
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

  const criterias = useCallback(
    (params?: CriteriasParamsInterface) => {
      const formId = params?.formId ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { formId, limit, perPage };
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
      const q = query(collection(fbFirestore, 'criterias'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapCriteria({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error('fetchCriteriaById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CRAETE CRITERIA
  const createCriteria = useCallback(async (payload: PayloadCreateCriteriaInterface) => {
    try {
      const docId = uuidv4();

      await setDoc(doc(fbFirestore, 'criterias', docId), {
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

  // UPDATE CRITERIA
  const updateCriteria = useCallback(
    async (id: string, payload: Partial<Omit<CriteriaInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<CriteriaInterface | null> => {
      if (!id) return null;

      try {
        const docRef = doc(fbFirestore, 'criterias', id);
        await updateDoc(docRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapCriteria(snap.data());

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
        const docRef = doc(fbFirestore, 'criterias', id);
        await deleteDoc(docRef);

        setAllCriteriasCache((prev) => prev.filter((u) => u.id !== id));
        setCriteriasList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllCriteriasCache, setCriteriasList]
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
