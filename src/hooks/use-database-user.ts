import { useEffect, useState, useCallback, useRef } from 'react';
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
  isLoadingAllUsers: boolean;
  allUsersError: string;
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
  allUsersCache: UserInterface[];
  currentUser: CurrentUserInterface | null;
  isLoadingUser: boolean;
}

// ----------------------------------------------------------------------

// baris tabel (snake_case) -> UserInterface (camelCase)
const mapUser = (row: any): UserInterface => ({
  id: row.id,
  authId: row.auth_id,
  name: row.name,
  nameLowercase: row.name_lowercase,
  phoneNumber: row.phone_number,
  role: row.role as RoleUserType,
  email: row.email,
  status: row.status,
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
});

// ----------------------------------------------------------------------

export const useDatabaseUser = (): UseDatabaseUserInterface => {
  const [allUsersCache, setAllUsersCache] = useState<UserInterface[]>([]);
  const [isLoadingAllUsers, setIsLoadingAllUsers] = useState<boolean>(true);
  const [allUsersError, setAllUsersError] = useState<string>('');
  const [usersList, setUsersList] = useState<UserInterface[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [currentUser, setCurrentUser] = useState<CurrentUserInterface | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(true);
  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const pageRef = useRef<number>(1);
  const activeListRef = useRef<boolean>(false); // true setelah users() dipanggil
  const requestIdRef = useRef<number>(0);
  const paramsRef = useRef<UsersParamsInterface>({ search: '', role: null, status: null, limit: 50, perPage: 5 });

  const { user } = useUserContext();

  // ----------------------------------------------------------------------
  // ALL USER CACHE
  // ----------------------------------------------------------------------

  const loadAllUsers = useCallback(async () => {
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: true });
    if (error) {
      console.error('allUsersCache error', error);
      setAllUsersCache([]);
      setAllUsersError('Daftar guru gagal dimuat. Silakan muat ulang halaman.');
      setIsLoadingAllUsers(false);
      return;
    }
    setAllUsersCache((data ?? []).map(mapUser));
    setAllUsersError('');
    setIsLoadingAllUsers(false);
  }, []);

  // ----------------------------------------------------------------------
  // CURRENT USER
  // ----------------------------------------------------------------------

  const loadCurrentUser = useCallback(async () => {
    if (!user) {
      setIsLoadingUser(false);
      return;
    }

    try {
      const userDecrypted = fDecrypt(user, USER_KEY) as CurrentUserInterface;

      if (userDecrypted?.uid) {
        const { data, error } = await supabase.from('users').select('*').eq('auth_id', userDecrypted.uid).limit(1).maybeSingle();

        if (error) {
          console.error('currentUser error', error);
          setCurrentUser({ ...userDecrypted, databaseUsers: null });
        } else {
          setCurrentUser({ ...userDecrypted, databaseUsers: data ? mapUser(data) : null });
        }
      } else {
        setCurrentUser({ ...userDecrypted, databaseUsers: null });
      }
    } catch (err) {
      console.error('decrypt current user error', err);
      setCurrentUser(null);
    } finally {
      setIsLoadingUser(false);
    }
  }, [user]);

  // ----------------------------------------------------------------------
  // LIST + PAGINATION
  // ----------------------------------------------------------------------

  const fetchPage = useCallback(async (pageIndex: number) => {
    const { role, status, search } = paramsRef.current;
    const pageSize = perPageRef.current;
    const from = (pageIndex - 1) * pageSize;
    const to = from + pageSize - 1;

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    setIsLoadingUsers(true);

    let q = supabase.from('users').select('*', { count: 'exact' });

    if (role) q = q.eq('role', role);
    if (status) q = q.eq('status', status);

    if (search) {
      const keyword = search.toLowerCase().trim().replace(/[%,]/g, '');
      q = q.ilike('name_lowercase', `${keyword}%`).order('name_lowercase', { ascending: true });
    } else {
      q = q.order('created_at', { ascending: false });
    }

    const { data, error, count } = await q.range(from, to);

    // abaikan hasil request lama
    if (requestId !== requestIdRef.current) return;

    if (error) {
      console.error('paginate error', error);
      setIsLoadingUsers(false);
      return;
    }

    setUsersList((data ?? []).map(mapUser));
    setTotalCount(Number(count ?? 0));
    setIsLoadingUsers(false);
  }, []);

  const subscribePage = useCallback(
    (pageIndex: number) => {
      const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));
      if (pageIndex < 1 || pageIndex > max) return;

      pageRef.current = pageIndex;
      setPage(pageIndex);
      fetchPage(pageIndex);
    },
    [fetchPage]
  );

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
      activeListRef.current = true;

      subscribePage(1);
    },
    [subscribePage]
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
    requestIdRef.current += 1; // batalkan request yang sedang jalan
    activeListRef.current = false;
    pageRef.current = 1;
    setUsersList([]);
    setPage(1);
    setIsLoadingUsers(false);
  }, []);

  // ----------------------------------------------------------------------
  // HELPERS
  // ----------------------------------------------------------------------

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
      const { data, error } = await supabase.from('users').select('*').eq('id', id).limit(1).maybeSingle();
      if (error) throw error;
      return data ? mapUser(data) : null;
    } catch (err) {
      console.error('fetchUserById error', err);
      return null;
    }
  }, []);

  // ----------------------------------------------------------------------
  // EFFECTS
  // ----------------------------------------------------------------------

  useEffect(() => {
    loadAllUsers();
  }, [loadAllUsers]);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  // Realtime: setiap ada perubahan di tabel users, muat ulang data
  const refreshRef = useRef<() => void>(() => {});
  refreshRef.current = () => {
    loadAllUsers();
    loadCurrentUser();
    if (activeListRef.current) fetchPage(pageRef.current);
  };

  useEffect(() => {
    const channelName = `users-changes-${Math.random().toString(36).slice(2)}`;

    const channel = supabase
      .channel(channelName)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        refreshRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // ----------------------------------------------------------------------

  const maxPages = Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current));

  const totalPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));

  const hasNext = page < totalPages;

  const hasPrev = page > 1;

  return {
    usersList,
    isLoadingAllUsers,
    allUsersError,
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