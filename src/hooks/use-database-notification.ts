import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
// supabase
import { supabase } from '/src/supabase';
import { subscribeToTableChanges } from '/src/supabase/realtime';
// interfaces
import { RoleUserType } from '/src/interfaces/user';
import { NotificationInterface, NotificationsParamsInterface, PayloadCreateNotificationInterface } from '/src/interfaces/notification';
import { toError } from '/src/utils/to-error';

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
  createNotification: (payload: PayloadCreateNotificationInterface) => Promise<{ userId: string; formId: string | null; name: string; description: string; targetRole: RoleUserType; isRead: boolean; id: string }>;
  updateNotification: (id: string, payload: Partial<Omit<NotificationInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<NotificationInterface | null>;
  deleteNotification: (id: string) => Promise<boolean>;
}

// ----------------------------------------------------------------------

const mapNotification = (data: any): NotificationInterface => ({
  id: data.id,
  formId: data.form_id ?? data.formId ?? null,
  userId: data.user_id ?? data.userId,
  name: data.name,
  description: data.description,
  isRead: data.is_read ?? data.isRead,
  targetRole: data.target_role ?? data.targetRole,
  createdAt: data.created_at ? new Date(data.created_at) : new Date(data.createdAt || Date.now()),
  updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(data.updatedAt || Date.now()),
});

// ----------------------------------------------------------------------

export const useDatabaseNotification = (): UseDatabaseNotificationInterface => {
  const [allNotificationsCache, setAllNotificationsCache] = useState<NotificationInterface[]>([]);
  const [notificationsList, setNotificationsList] = useState<NotificationInterface[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);

  const perPageRef = useRef<number>(5);
  const limitRef = useRef<number>(50);
  const paramsRef = useRef<NotificationsParamsInterface>({ formId: '', userId: '', targetRole: undefined, limit: 50, perPage: 5 });

  const subscribePage = useCallback(async (pageIndex: number) => {
    const pageSize = perPageRef.current;
    const { formId, userId, targetRole } = paramsRef.current;
    const from = (pageIndex - 1) * pageSize;
    const to = from + pageSize - 1;
    setIsLoading(true);
    try {
      let q = supabase.from('notifications').select('*', { count: 'exact' });
      if (formId) q = q.eq('form_id', formId);
      if (userId) q = q.eq('user_id', userId);
      if (targetRole) q = q.eq('target_role', targetRole);
      q = q.order('created_at', { ascending: false }).range(from, to);
      const { data, count, error } = await q;
      if (!error && data) {
        setNotificationsList(data.map(mapNotification));
        if (count !== null && count !== undefined) setTotalCount(count);
      }
    } catch (err) {
      console.error('subscribePage notifications error', err);
    } finally {
      setIsLoading(false);
      setPage(pageIndex);
    }
  }, []);

  // Keep the admin notification badge in sync when a new notification arrives.
  useEffect(() => {
    let isMounted = true;
    const fetchAll = async () => {
      const { data } = await supabase.from('notifications').select('*').order('created_at', { ascending: true });
      if (data && isMounted) setAllNotificationsCache(data.map(mapNotification));
    };
    const refreshNotifications = () => {
      fetchAll();
      subscribePage(1);
    };
    fetchAll();
    const unsubscribe = subscribeToTableChanges('notifications', refreshNotifications);
    return () => { isMounted = false; unsubscribe(); };
  }, [subscribePage]);

  const notifications = useCallback((params?: NotificationsParamsInterface) => {
    paramsRef.current = { formId: params?.formId ?? '', userId: params?.userId ?? '', targetRole: params?.targetRole, limit: params?.limit ?? 50, perPage: params?.perPage ?? 5 };
    limitRef.current = params?.limit ?? 50;
    perPageRef.current = params?.perPage ?? 5;
    subscribePage(1);
  }, [subscribePage]);

  const maxPages = Math.max(1, Math.ceil((totalCount || limitRef.current || 50) / perPageRef.current));
  const hasNext = page < maxPages;
  const hasPrev = page > 1;

  const nextPage = useCallback(() => { if (page < maxPages) subscribePage(page + 1); }, [page, maxPages, subscribePage]);
  const prevPage = useCallback(() => { if (page > 1) subscribePage(page - 1); }, [page, subscribePage]);
  const resetPagination = useCallback(() => { setNotificationsList([]); setPage(1); setIsLoading(false); }, []);

  const getNotificationById = useCallback((id: string) => allNotificationsCache.find((u) => u.id === id) ?? null, [allNotificationsCache]);

  const fetchNotificationById = useCallback(async (id: string): Promise<NotificationInterface | null> => {
    if (!id) return null;
    const { data, error } = await supabase.from('notifications').select('*').eq('id', id).maybeSingle();
    if (error || !data) return null;
    return mapNotification(data);
  }, []);

  const createNotification = useCallback(async (payload: PayloadCreateNotificationInterface) => {
    try {
      const id = uuidv4();
      const { error } = await supabase.from('notifications').insert({
        id,
        user_id: payload.userId,
        form_id: payload.formId,
        name: payload.name,
        description: payload.description,
        target_role: payload.targetRole,
        is_read: payload.isRead,
      });
      if (error) throw error;
      return { id, userId: payload.userId, formId: payload.formId, name: payload.name, description: payload.description, targetRole: payload.targetRole, isRead: payload.isRead };
    } catch (error) { throw toError(error); }
  }, []);

  const updateNotification = useCallback(async (id: string, payload: Partial<Omit<NotificationInterface, 'id' | 'createdAt' | 'updatedAt'>>): Promise<NotificationInterface | null> => {
    if (!id) return null;
    try {
      const updateData: any = {};
      if (payload.userId !== undefined) updateData.user_id = payload.userId;
      if (payload.formId !== undefined) updateData.form_id = payload.formId;
      if (payload.name !== undefined) updateData.name = payload.name;
      if (payload.description !== undefined) updateData.description = payload.description;
      if (payload.targetRole !== undefined) updateData.target_role = payload.targetRole;
      if (payload.isRead !== undefined) updateData.is_read = payload.isRead;
      const { data, error } = await supabase.from('notifications').update(updateData).eq('id', id).select().single();
      if (error) throw error;
      const updated = mapNotification(data);
      setAllNotificationsCache((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setNotificationsList((prev) => prev.map((item) => (item.id === id ? updated : item)));
      return updated;
    } catch (err) { throw toError(err); }
  }, []);

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    if (!id) return false;
    try {
      const { error } = await supabase.from('notifications').delete().eq('id', id);
      if (error) throw error;
      setAllNotificationsCache((prev) => prev.filter((u) => u.id !== id));
      setNotificationsList((prev) => prev.filter((u) => u.id !== id));
      return true;
    } catch (err) { throw toError(err); }
  }, []);

  return { notificationsList, isLoading, page, perPage: perPageRef.current, maxPages, hasNext, hasPrev, notifications, nextPage, prevPage, resetPagination, getNotificationById, fetchNotificationById, createNotification, updateNotification, deleteNotification, allNotificationsCache };
};
