import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/lib/supabase';
// interfaces
import { RoleUserType } from '/src/interfaces/user';
import { NotificationInterface, NotificationsParamsInterface, PayloadCreateNotificationInterface } from '/src/interfaces/notification';

// ----------------------------------------------------------------------

export interface UseDatabaseNotificationInterface {
  notificationsList: NotificationInterface[];
  isLoading: boolean;
  page: number;
  perPage: number;
  maxPages: number;
  hasNext: boolean;
  hasPrev: boolean;
  notifications: (params?: NotificationsParamsInterface) => void;
  nextPage: () => void;
  prevPage: () => void;
  resetPagination: () => void;
  getNotificationById: (id: string) => NotificationInterface | null;
  fetchNotificationById: (id: string) => Promise<NotificationInterface | null>;
  allNotificationsCache: NotificationInterface[];
  createNotification: (payload: PayloadCreateNotificationInterface) => Promise<{ userId: string; formId: string; name: string; description: string; targetRole: RoleUserType; isRead: boolean; id: string }>;
  updateNotification: (id: string, payload: Partial<Omit<NotificationInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<NotificationInterface | null>;
  deleteNotification: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapNotification = (data: any): NotificationInterface => ({
  id: data.id,
  formId: data.form_id ?? data.formId,
  userId: data.user_id ?? data.userId,
  name: data.name,
  description: data.description,
  isRead: data.is_read ?? data.isRead,
  targetRole: data.target_role ?? data.targetRole,
  createdAt: new Date(data.created_at ?? data.createdAt),
  updatedAt: new Date(data.updated_at ?? data.updatedAt),
});

// ----------------------------------------------------------------------

export const useDatabaseNotification = (): UseDatabaseNotificationInterface => {
  const [allNotificationsCache, setAllNotificationsCache] = useState<NotificationInterface[]>([]);
  const [notificationsList, setNotificationsList] = useState<NotificationInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<NotificationsParamsInterface>({ formId: '', userId: '', targetRole: undefined, limit: 50, perPage: 5 });

  // ALL NOTIFICATIONS CACHE
  useEffect(() => {
    let cancelled = false;

    const fetchAll = async () => {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: true });
      if (!cancelled && data) setAllNotificationsCache(data.map(mapNotification));
    };

    fetchAll();

    const channel = supabase
      .channel(`notifications-cache-${uuidv4()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => fetchAll())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      setAllNotificationsCache([]);
    };
  }, []);

  const subscribePage = useCallback(async (pageIndex: number) => {
    const perPage = perPageRef.current;
    const max = Math.max(1, Math.ceil((limitRef.current || 50) / perPage));
    if (pageIndex < 1 || pageIndex > max) return;

    setIsLoading(true);
    try {
      const { formId, userId, targetRole } = paramsRef.current;
      const from = (pageIndex - 1) * perPage;
      const to = from + perPage - 1;

      let q = supabase.from('notifications').select('*').order('created_at', { ascending: false });
      if (formId) q = q.eq('form_id', formId);
      if (userId) q = q.eq('user_id', userId);
      if (targetRole) q = q.eq('target_role', targetRole);
      q = q.range(from, to);

      const { data } = await q;
      setNotificationsList((data ?? []).map(mapNotification));
    } finally {
      setIsLoading(false);
    }
    setPage(pageIndex);
  }, []);

  const notifications = useCallback(
    (params?: NotificationsParamsInterface) => {
      paramsRef.current = {
        formId: params?.formId ?? '',
        userId: params?.userId ?? '',
        targetRole: params?.targetRole ?? undefined,
        limit: params?.limit ?? 50,
        perPage: params?.perPage ?? 5,
      };
      limitRef.current = params?.limit ?? 50;
      perPageRef.current = params?.perPage ?? 5;
      subscribePage(1);
    },
    [subscribePage]
  );

  const nextPage = useCallback(() => {
    if (page >= Math.max(1, Math.ceil((limitRef.current || 50) / perPageRef.current))) return;
    subscribePage(page + 1);
  }, [page, subscribePage]);

  const prevPage = useCallback(() => {
    if (page <= 1) return;
    subscribePage(page - 1);
  }, [page, subscribePage]);

  const resetPagination = useCallback(() => {
    setNotificationsList([]);
    setPage(1);
    setIsLoading(false);
  }, []);

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
      const { data } = await supabase.from('notifications').select('*').eq('id', id).limit(1).single();
      return data ? mapNotification(data) : null;
    } catch {
      return null;
    }
  }, []);

  const safeWrapError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

  const createNotification = useCallback(async (payload: PayloadCreateNotificationInterface) => {
    try {
      const docId = uuidv4();
      const now = new Date().toISOString();
      const { error } = await supabase.from('notifications').insert({
        id: docId,
        form_id: payload.formId,
        user_id: payload.userId,
        name: payload.name,
        description: payload.description,
        is_read: payload.isRead,
        target_role: payload.targetRole,
        created_at: now,
        updated_at: now,
      });
      if (error) throw new Error(error.message);
      return { id: docId, ...payload };
    } catch (error) {
      throw safeWrapError(error);
    }
  }, []);

  const updateNotification = useCallback(
    async (id: string, payload: Partial<Omit<NotificationInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<NotificationInterface | null> => {
      if (!id) return null;
      try {
        const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
        if (payload.formId !== undefined) updateData.form_id = payload.formId;
        if (payload.userId !== undefined) updateData.user_id = payload.userId;
        if (payload.name !== undefined) updateData.name = payload.name;
        if (payload.description !== undefined) updateData.description = payload.description;
        if (payload.isRead !== undefined) updateData.is_read = payload.isRead;
        if (payload.targetRole !== undefined) updateData.target_role = payload.targetRole;

        const { data, error } = await supabase.from('notifications').update(updateData).eq('id', id).select().single();
        if (error) throw new Error(error.message);

        const updated = mapNotification(data);
        setAllNotificationsCache((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        setNotificationsList((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        return updated;
      } catch (err) {
        throw safeWrapError(err);
      }
    },
    []
  );

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw new Error(error.message);
      setAllNotificationsCache((prev) => prev.filter((u) => u.id !== id));
      setNotificationsList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) {
      throw safeWrapError(err);
    }
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
