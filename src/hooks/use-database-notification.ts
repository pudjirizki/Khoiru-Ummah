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
import { RoleUserType } from '/src/interfaces/user';
import { NotificationInterface, NotificationsParamsInterface, PayloadCreateNotificationInterface } from '/src/interfaces/notification';

// ----------------------------------------------------------------------

export interface UseDatabaseNotificationInterface {
  notificationsList: NotificationInterface[];
  isLoading: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  // controls
  notifications: (params?: NotificationsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  // helpers
  getNotificationById: (id: string) => NotificationInterface | null; // local
  fetchNotificationById: (id: string) => Promise<NotificationInterface | null>; // cloud
  // raw
  allNotificationsCache: NotificationInterface[]; // optional cache maintained by a background listener (kept small cost)
  //
  createNotification: (payload: PayloadCreateNotificationInterface) => Promise<{
    userId: string;
    formId: string;
    name: string;
    description: string;
    targetRole: RoleUserType;
    isRead: boolean;
    id: string;
  }>;
  updateNotification: (id: string, payload: Partial<Omit<NotificationInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<NotificationInterface | null>;
  deleteNotification: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapNotification = (data: any): NotificationInterface => ({
  id: data.id,
  formId: data.formId,
  userId: data.userId,
  name: data.name,
  description: data.description,
  isRead: data.isRead,
  targetRole: data.targetRole,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseNotification = (): UseDatabaseNotificationInterface => {
  const [allNotificationsCache, setAllNotificationsCache] = useState<NotificationInterface[]>([]);

  const [notificationsList, setNotificationsList] = useState<NotificationInterface[]>([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<NotificationsParamsInterface>({ formId: '', userId: '', targetRole: undefined, limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ALL NOTIFICATIONS CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'notifications'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: NotificationInterface[] = [];
        snap.forEach((d) => arr.push(mapNotification({ id: d.id, ...d.data() })));
        setAllNotificationsCache(arr);
      },
      (err) => {
        console.error('allNotificationsCache snapshot error', err);
        setAllNotificationsCache([]);
      }
    );

    return () => {
      unsub();
      setAllNotificationsCache([]);
    };
  }, []);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { formId, userId, targetRole } = paramsRef.current;
    const pageSize = perPageRef.current;

    const collectionRef = collection(fbFirestore, 'notifications');
    const qParts: any[] = [];

    if (formId) qParts.push(where('formId', '==', formId));
    if (userId) qParts.push(where('userId', '==', userId));
    if (targetRole) qParts.push(where('targetRole', '==', targetRole));

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
          const list: NotificationInterface[] = [];
          snap.forEach((d) => {
            list.push(mapNotification({ id: d.id, ...d.data() }));
          });

          setNotificationsList(list);
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

  const notifications = useCallback(
    (params?: NotificationsParamsInterface) => {
      const formId = params?.formId ?? '';
      const userId = params?.userId ?? '';
      const targetRole = params?.targetRole ?? undefined;
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { formId, userId, targetRole, limit, perPage };
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
    setNotificationsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

  // LOCAL GETTER
  const getNotificationById = useCallback(
    (id: string): NotificationInterface | null => {
      if (!id) return null;
      return allNotificationsCache.find((u) => u.id === id) ?? null;
    },
    [allNotificationsCache]
  );

  const fetchNotificationById = useCallback(async (id: string): Promise<NotificationInterface | null> => {
    if (!id) return null;
    try {
      const q = query(collection(fbFirestore, 'notifications'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const docSnap = snap.docs[0];
      return mapNotification({ id: docSnap.id, ...docSnap.data() });
    } catch (err) {
      console.error('fetchNotificationById error', err);
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  // CRAETE NOTIFICATIONS
  const createNotification = useCallback(async (payload: PayloadCreateNotificationInterface) => {
    try {
      const docId = uuidv4();

      await setDoc(doc(fbFirestore, 'notifications', docId), {
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

  // UPDATE NOTIFICATIONS
  const updateNotification = useCallback(
    async (id: string, payload: Partial<Omit<NotificationInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<NotificationInterface | null> => {
      if (!id) return null;

      try {
        const docRef = doc(fbFirestore, 'notifications', id);
        await updateDoc(docRef, {
          ...payload,
          updatedAt: serverTimestamp(),
        });

        const snap = await getDoc(docRef);
        if (!snap.exists()) return null;

        const updated = mapNotification(snap.data());

        setAllNotificationsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setNotificationsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllNotificationsCache, setNotificationsList]
  );

  // DELETE NOTIFICATIONS
  const deleteNotification = useCallback(
    async (id: string): Promise<boolean> => {
      if (!id) return false;

      try {
        const docRef = doc(fbFirestore, 'notifications', id);
        await deleteDoc(docRef);

        setAllNotificationsCache((prev) => prev.filter((u) => u.id !== id));
        setNotificationsList((prev) => prev.filter((u) => u.id !== id));

        return true;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    [setAllNotificationsCache, setNotificationsList]
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
    notificationsList,
    isLoading,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    notifications,
    nextPage,
    prevPage,
    resetPagination,
    getNotificationById,
    fetchNotificationById,
    createNotification,
    updateNotification,
    deleteNotification,
    allNotificationsCache,
  };
};
