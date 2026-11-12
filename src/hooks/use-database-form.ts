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
  createdBy: data.createdBy,
  title: data.title,
  class: data.class,
  description: data.description,
  notes: data.notes,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseForm = (): UseDatabaseFormInterface => {
  const [allFormsCache, setAllFormsCache] = useState<FormInterface[]>([]);

  const [formsList, setFormsList] = useState<FormInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<FormsParamsInterface>({ class: '', limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL FORM CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'forms'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: FormInterface[] = [];
        snap.forEach((d) => arr.push(mapForm({ id: d.id, ...d.data() })));
        setAllFormsCache(arr);
      },
      (err) => {
        console.error('allFormsCache snapshot error', err);
        setAllFormsCache([]);
      }
    );

    return () => {
      unsub();
      setAllFormsCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { class: classFilter } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'forms');
    const qParts: any[] = [];

    if (classFilter) qParts.push(where('class', 'array-contains', classFilter));

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
          const list: FormInterface[] = [];
          snap.forEach((d) => {
            list.push(mapForm({ id: d.id, ...d.data() }));
          });

          setFormsList(list);
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

  const forms = useCallback(
    (params?: FormsParamsInterface) => {
      const classFilter = params?.class ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { class: classFilter, limit, perPage };
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
      const q = query(collection(fbFirestore, 'forms'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapForm({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error('fetchFormById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CRAETE FORM
  const createForm = useCallback(async (payload: PayloadCreateFormInterface) => {
    try {
      const docId = uuidv4();

      await setDoc(doc(fbFirestore, 'forms', docId), {
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

  // UPDATE FORM
  const updateForm = useCallback(
    async (id: string, payload: Partial<Omit<FormInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<FormInterface | null> => {
      if (!id) return null;

      try {
        const docRef = doc(fbFirestore, 'forms', id);
        await updateDoc(docRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapForm(snap.data());

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
        const docRef = doc(fbFirestore, 'forms', id);
        await deleteDoc(docRef);

        setAllFormsCache((prev) => prev.filter((u) => u.id !== id));
        setFormsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllFormsCache, setFormsList]
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
