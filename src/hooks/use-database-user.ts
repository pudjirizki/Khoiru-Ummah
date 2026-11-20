import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// context
import { useUserContext } from '/src/context/user';
// supabase
import { supabase } from '/src/lib/supabase';
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
  getUserById: (id: string) => UserInterface | null;
  fetchUserById: (id: string) => Promise<UserInterface | null>;
  // current user & raw
  allUsersCache: UserInterface[];
  currentUser: CurrentUserInterface | null;
  isLoadingUser: boolean;
}

// ----------------------------------------------------------------------

const mapUser = (data: any): UserInterface => ({
  id: data.id,
  authId: data.auth_id ?? data.authId,
  name: data.name,
  nameLowercase: data.name_lowercase ?? data.nameLowercase,
  phoneNumber: data.phone_number ?? data.phoneNumber,
  role: data.role as RoleUserType,
  email: data.email,
  status: data.status,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
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

  // ALL USER CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) setAllUsersCache(data.map(mapUser));
    };

    fetchAll();

    const channel = supabase
      .channel(`users-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllUsersCache([]);
    };
  }, []);

  // CURRENT USER
  useEffect(() => {
    let cancelled = false;

    if (!user) {
      const t = setTimeout(() => setIsLoadingUser(false), 3000);
      return () => clearTimeout(t);
    }

    const fetchCurrentUser = async () => {
      try {
        const userDecrypted = fDecrypt(user, USER_KEY) as any;
        const uid = userDecrypted?.uid ?? userDecrypted?.id;
        const email = userDecrypted?.email;

        if (uid || email) {
          let q = supabase.from('users').select('*');
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(uid));
          if (isUuid) {
            q = q.or(`auth_id.eq.${uid},id.eq.${uid}${email ? `,email.eq.${email}` : ''}`);
          } else if (email) {
            q = q.eq('email', email);
          } else {
            q = q.eq('auth_id', uid);
          }

          const { data } = await q.limit(1);
          if (cancelled) return;
          const dbUser = data && data.length > 0 ? mapUser(data[0]) : null;
          setCurrentUser({
            ...userDecrypted,
            uid: uid ?? '',
            email: email ?? '',
            photoURL: userDecrypted?.photoURL ?? null,
            displayName: userDecrypted?.displayName ?? null,
            databaseUsers: dbUser,
          });
        } else {
          setCurrentUser({
            ...userDecrypted,
            uid: '',
            email: '',
            databaseUsers: null,
          });
        }
      } catch {
        if (!cancelled) setCurrentUser(null);
      } finally {
        if (!cancelled) setIsLoadingUser(false);
      }
    };

    fetchCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const fetchTotalCount = useCallback(async () => {
    try {
      const { role, status, search } = paramsRef.current;
      let q = supabase.from('users').select('*', { count: 'exact', head: true });
      if (role) q = q.eq('role', role);
      if (status) q = q.eq('status', status);
      if (search) {
        const keyword = search.toLowerCase().trim();
        q = q.gte('name_lowercase', keyword).lte('name_lowercase', keyword + '\uf8ff');
      }
      const { count } = await q;
      setTotalCount(count ?? 0);
    } catch {
      setTotalCount(0);
    }
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoadingUsers(true);

    try {
      const { role, status, search } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('users').select('*');
      if (role) q = q.eq('role', role);
      if (status) q = q.eq('status', status);
      if (search) {
        const keyword = search.toLowerCase().trim();
        q = q.gte('name_lowercase', keyword).lte('name_lowercase', keyword + '\uf8ff').order('name_lowercase');
      } else {
        q = q.order('created_at', { ascending: false });
      }
      q = q.range(from, to);

      const { data } = await q;
      setUsersList((data ?? []).map(mapUser));
    } finally {
      setIsLoadingUsers(false);
    }

    setPage(pageIndex);
  }, []);

  const users = useCallback(
    (params?: UsersParamsInterface) => {
      paramsRef.current = {
        role: params?.role ?? null,
        status: params?.status ?? null,
        search: params?.search ?? '',
        limit: params?.limit ?? 50,
        perPage: params?.perPage ?? 5,
      };
      limitRef.current = params?.limit ?? 50;
      perPageRef.current = params?.perPage ?? 5;

      fetchTotalCount();
      subscribePage(1);
    },
    [subscribePage, fetchTotalCount]
  );

  const nextPage = useCallback(() => {
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
    if (page >= max) return;
    subscribePage(page + 1);
  }, [page, subscribePage]);

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
      const { data } = await supabase.from('users').select('*').eq('id', id).limit(1).single();
      return data ? mapUser(data) : null;
    } catch {
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
