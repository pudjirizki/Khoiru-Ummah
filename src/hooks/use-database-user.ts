import { useEffect, useState, useCallback, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDocs, limit as fbLimit, startAfter, QueryDocumentSnapshot, Timestamp, getCountFromServer } from 'firebase/firestore';
// context
import { useUserContext } from '/src/context/user';
// firebase
import { fbFirestore } from '/src/firebase';
// interfaces
import { CurrentUserInterface, UserInterface, RoleUserType, UsersParamsInterface } from '/src/interfaces/user';
// config-global
import { USER_KEY } from '/src/config-global';
// utils
import { fDecrypt } from '/src/utils/format-encrypt';

// ----------------------------------------------------------------------

export interface UseDatabaseUserInterface {
  usersList: UserInterface[];
  isLoadingUsers: boolean;
  // pagination meta
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalCount: number;
  // controls
  users: (params?: UsersParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  subscribePage: (pageIndex: number) => void;
  // helpers
  getUserById: (id: string) => UserInterface | null; // local
  fetchUserById: (id: string) => Promise<UserInterface | null>; // cloud
  // current user & raw
  allUsersCache: UserInterface[]; // optional cache maintained by a background listener (kept small cost)
  currentUser: CurrentUserInterface | null;
  isLoadingUser: boolean;
}

// ----------------------------------------------------------------------

const mapUser = (data: any): UserInterface => ({
  id: data.id,
  authId: data.authId,
  name: data.name,
  nameLowercase: data.nameLowercase,
  phoneNumber: data.phoneNumber,
  role: data.role as RoleUserType,
  email: data.email,
  status: data.status,
  createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
  updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseUser = (): UseDatabaseUserInterface => {
  const [allUsersCache, setAllUsersCache] = useState<UserInterface[]>([]);

  const [usersList, setUsersList] = useState<UserInterface[]>([]);

  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);

  const [page, setPage] = useState<number>(1);

  const [currentUser, setCurrentUser] = useState<CurrentUserInterface | null>(null);

  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);

  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);

  const limitRef = useRef<number>(50);

  const cursorsRef = useRef<QueryDocumentSnapshot<any>[] | null[]>([null]);

  const lastVisibleRef = useRef<QueryDocumentSnapshot<any> | null>(null);

  const paramsRef = useRef<UsersParamsInterface>({ search: '', role: null, status: null, limit: 50, perPage: 5 });

  const unsubscribeRef = useRef<(() => void) | null>(null);

  const { user } = useUserContext();

  // ALL USER CACHE
  useEffect(() => {
    const q = query(collection(fbFirestore, 'users'), orderBy('createdAt'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: UserInterface[] = [];
        snap.forEach((d) => arr.push(mapUser(d.data())));
        setAllUsersCache(arr);
      },
      (err) => {
        console.error('allUsersCache snapshot error', err);
        setAllUsersCache([]);
      }
    );

    return () => {
      unsub();
      setAllUsersCache([]);
    };
  }, []);

  // CURRENT USER
  useEffect(() => {
    let unsubCurrent: (() => void) | null = null;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!user) {
      fallbackTimeout = setTimeout(() => setIsLoadingUser(false), 3000);
      return () => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
      };
    }

    try {
      const userDecrypted = fDecrypt(user, USER_KEY) as CurrentUserInterface;

      if (userDecrypted?.uid) {
        const q = query(collection(fbFirestore, 'users'), where('authId', '==', userDecrypted.uid));
        unsubCurrent = onSnapshot(
          q,
          (snap) => {
            if (snap.empty) {
              setCurrentUser({ ...userDecrypted, databaseUsers: null });
            } else {
              const doc = snap.docs[0];
              setCurrentUser({ ...userDecrypted, databaseUsers: mapUser(doc.data()) });
            }
            setIsLoadingUser(false);
          },
          (err) => {
            console.error('currentUser snapshot error', err);
            setIsLoadingUser(false);
          }
        );
      } else {
        setCurrentUser({ ...userDecrypted, databaseUsers: null });
        setIsLoadingUser(false);
      }
    } catch (err) {
      console.error('decrypt current user error', err);
      setCurrentUser(null);
      setIsLoadingUser(false);
    }

    return () => {
      if (unsubCurrent) unsubCurrent();
    };
  }, [user]);

  const buildQueryForPage = useCallback((pageIndex: number) => {
    const { role, status, search } = paramsRef.current;
    const pageSize = perPageRef.current;

    const qParts: any[] = [];

    if (role) {
      qParts.push(where('role', '==', role));
    }

    if (status) {
      qParts.push(where('status', '==', status));
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

    return query(collection(fbFirestore, 'users'), ...qParts);
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

      setIsLoadingUsers(true);

      const q = buildQueryForPage(pageIndex);

      const unsub = onSnapshot(
        q,
        (snap) => {
          console.info('[paginate snapshot] page', pageIndex, 'size', snap.size);
          const list: UserInterface[] = [];
          snap.forEach((d) => {
            list.push(mapUser(d.data()));
          });

          setUsersList(list);
          setIsLoadingUsers(false);

          const last = snap.docs[snap.docs.length - 1] ?? null;
          lastVisibleRef.current = last || null;
          cursorsRef.current[pageIndex] = last || null;
        },
        (err) => {
          console.error('paginate snapshot error', err.code, err.message);
          setIsLoadingUsers(false);
        }
      );

      unsubscribeRef.current = unsub;
      setPage(pageIndex);
    },
    [buildQueryForPage]
  );

  const fetchTotalCount = useCallback(async () => {
    try {
      const { role, status, search } = paramsRef.current;

      const constraints: any[] = [];

      if (role) {
        constraints.push(where('role', '==', role));
      }

      if (status) {
        constraints.push(where('status', '==', status));
      }

      if (search) {
        const keyword = search.toLowerCase().trim();
        constraints.push(orderBy('nameLowercase'));
        constraints.push(where('nameLowercase', '>=', keyword));
        constraints.push(where('nameLowercase', '<=', keyword + '\uf8ff'));
      }

      const q = query(collection(fbFirestore, 'users'), ...constraints);

      const countSnap = await getCountFromServer(q);
      const total = Number(countSnap.data().count ?? 0);

      setTotalCount(total);
    } catch (err) {
      console.error('fetchTotalCount error', err);
      setTotalCount(0);
    }
  }, []);

  const users = useCallback(
    (params?: UsersParamsInterface) => {
      const role = params?.role ?? null;
      const status = params?.status ?? null;
      const search = params?.search ?? '';
      const limit = params?.limit ?? 50;
      const perPage = params?.perPage ?? 5;

      paramsRef.current = { role, status, search, limit, perPage };
      limitRef.current = limit;
      perPageRef.current = perPage;

      cursorsRef.current = [null];
      lastVisibleRef.current = null;

      fetchTotalCount();

      subscribePage(1);
    },
    [subscribePage, fetchTotalCount]
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
    setUsersList([]);
    setPage(1);
    setIsLoadingUsers(false);
  }, []);

  // LOCAL GETTER
  const getUserById = useCallback(
    (id: string): UserInterface | null => {
      if (!id) return null;
      return allUsersCache.find((u) => u.id === id) ?? null;
    },
    [allUsersCache]
  );

  const fetchUserById = useCallback(async (id: string): Promise<UserInterface | null> => {
    if (!id) return null;
    try {
      const q = query(collection(fbFirestore, 'users'), where('id', '==', id), fbLimit(1));
      const snap = await getDocs(q);
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return mapUser(doc.data());
    } catch (err) {
      console.error('fetchUserById error', err);
      return null;
    }
  }, []);

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
    usersList,
    isLoadingUsers,
    page,
    perPage: perPageRef.current,
    maxPages: Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current)),
    hasNext,
    hasPrev,
    users,
    nextPage,
    prevPage,
    resetPagination,
    subscribePage,
    getUserById,
    fetchUserById,
    allUsersCache,
    currentUser,
    isLoadingUser,
    totalCount,
  };
};
