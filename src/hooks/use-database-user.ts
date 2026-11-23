import { useEffect, useState, useCallback, useRef } from 'react';
// context
import { useUserContext } from '/src/context/user';
// supabase
<<<<<<< Updated upstream
import { supabase } from '/src/supabase';
import { subscribeToTableChanges } from '/src/supabase/realtime';
=======
import { createRealtimeChannel, supabase } from '/src/supabase';
>>>>>>> Stashed changes
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
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  totalCount: number;
  users: (params?: UsersParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  subscribePage: (pageIndex: number) => void;
  getUserById: (id: string) => UserInterface | null;
  fetchUserById: (id: string) => Promise<UserInterface | null>;
  allUsersCache: UserInterface[];
  currentUser: CurrentUserInterface | null;
  isLoadingUser: boolean;
}

// ----------------------------------------------------------------------

const mapUser = (data: any): UserInterface => ({
  id: data.id,
  authId: data.auth_id ?? data.authId,
  name: data.name,
  nameLowercase: data.name_lowercase ?? data.nameLowercase ?? data.name?.toLowerCase(),
  phoneNumber: data.phone_number ?? data.phoneNumber,
  role: data.role as RoleUserType,
  email: data.email,
  status: data.status,
  createdAt: data.created_at ? new Date(data.created_at) : new Date(),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(),
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
  const paramsRef = useRef<UsersParamsInterface>({ search: '', role: null, status: null, limit: 50, perPage: 5 });

  const { user } = useUserContext();

  // ALL USER CACHE + REALTIME
  useEffect(() => {
    let isMounted = true;

    const fetchAll = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('allUsersCache fetch error', error);
        if (isMounted) setAllUsersCache([]);
        return;
      }

      if (isMounted && data) {
        setAllUsersCache(data.map(mapUser));
      }
    };

    fetchAll();

<<<<<<< Updated upstream
    const unsubscribe = subscribeToTableChanges('users', fetchAll);
=======
    const channel = createRealtimeChannel('public:users_all_cache')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          fetchAll();
        }
      )
      .subscribe();
>>>>>>> Stashed changes

    return () => {
      isMounted = false;
      unsubscribe();
      setAllUsersCache([]);
    };
  }, []);

  // CURRENT USER + REALTIME
  useEffect(() => {
    let isMounted = true;
    let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

    if (!user) {
      fallbackTimeout = setTimeout(() => {
        if (isMounted) setIsLoadingUser(false);
      }, 1500);
      return () => {
        if (fallbackTimeout) clearTimeout(fallbackTimeout);
      };
    }

    let authId = '';
    let userDecrypted: CurrentUserInterface | null = null;

    try {
      userDecrypted = fDecrypt(user, USER_KEY) as CurrentUserInterface;
      authId = userDecrypted?.uid || userDecrypted?.id || '';
    } catch (err) {
      console.error('decrypt current user error', err);
      setCurrentUser(null);
      setIsLoadingUser(false);
      return;
    }

    if (!authId) {
      setCurrentUser(userDecrypted);
      setIsLoadingUser(false);
      return;
    }

    const fetchCurrent = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error('currentUser fetch error', error);
      }

      if (data) {
        setCurrentUser({ ...userDecrypted, databaseUsers: mapUser(data) });
      } else {
        setCurrentUser({ ...userDecrypted, databaseUsers: null });
      }
      setIsLoadingUser(false);
    };

    fetchCurrent();

<<<<<<< Updated upstream
    const unsubscribe = subscribeToTableChanges('users', (payload) => {
=======
    const channel = createRealtimeChannel(`public:users_${authId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `auth_id=eq.${authId}` },
        (payload) => {
>>>>>>> Stashed changes
          if (!isMounted) return;
          if (payload.new) {
            setCurrentUser({ ...userDecrypted, databaseUsers: mapUser(payload.new) });
          } else if (payload.eventType === 'DELETE') {
            setCurrentUser({ ...userDecrypted, databaseUsers: null });
          }
        }, `auth_id=eq.${authId}`);

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  const fetchTotalCount = useCallback(async () => {
    try {
      const { role, status, search } = paramsRef.current;
      let q = supabase.from('users').select('*', { count: 'exact', head: true });

      if (role) q = q.eq('role', role);
      if (status) q = q.eq('status', status);
      if (search) q = q.ilike('name', `%${search.trim()}%`);

      const { count, error } = await q;
      if (error) throw error;
      setTotalCount(count ?? 0);
    } catch (err) {
      console.error('fetchTotalCount error', err);
      setTotalCount(0);
    }
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const pageSize = perPageRef.current;
    const from = (pageIndex - 1) * pageSize;
    const to = from + pageSize - 1;

    setIsLoadingUsers(true);

    try {
      const { role, status, search } = paramsRef.current;
      let q = supabase.from('users').select('*', { count: 'exact' });

      if (role) q = q.eq('role', role);
      if (status) q = q.eq('status', status);
      if (search) q = q.ilike('name', `%${search.trim()}%`);

      q = q.order('created_at', { ascending: false }).range(from, to);

      const { data, count, error } = await q;

      if (error) throw error;

      setUsersList((data || []).map(mapUser));
      if (count !== null) setTotalCount(count);
      setPage(pageIndex);
    } catch (err) {
      console.error('paginate fetch error', err);
      setUsersList([]);
    } finally {
      setIsLoadingUsers(false);
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

      fetchTotalCount();
      subscribePage(1);
    },
    [subscribePage, fetchTotalCount]
  );

  const nextPage = useCallback(() => {
    const max = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
    if (page >= max) return;
    subscribePage(page + 1);
  }, [page, totalCount, subscribePage]);

  const prevPage = useCallback(() => {
    if (page <= 1) return;
    subscribePage(page - 1);
  }, [page, subscribePage]);

  const resetPagination = useCallback(() => {
    setUsersList([]);
    setPage(1);
    setIsLoadingUsers(false);
  }, []);

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
      const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
      if (error || !data) return null;
      return mapUser(data);
    } catch (err) {
      console.error('fetchUserById error', err);
      return null;
    }
  }, []);

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  return {
    usersList,
    isLoadingUsers,
    page,
    perPage: perPageRef.current,
    maxPages,
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
