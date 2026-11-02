import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { UseDatabaseFormInterface } from '/src/hooks/use-database-form';
import { UseDatabaseNotificationInterface } from '/src/hooks/use-database-notification';
// interfaces
import { FormInterface } from '/src/interfaces/form';
import { CurrentUserInterface } from '/src/interfaces/user';
import { NotificationInterface } from '/src/interfaces/notification';
// utils
import { fToNow } from '/src/utils/format-time';
import { fFirstChar } from '/src/utils/format-string';
// components
import { Button } from '/src/components/button';
import { DialogGeneral } from '/src/components/dialog';

// ----------------------------------------------------------------------

interface NotificationProps {
  currentUser: CurrentUserInterface;
  notifications: UseDatabaseNotificationInterface['notifications'];
  notificationsList: UseDatabaseNotificationInterface['notificationsList'];
  updateNotification: UseDatabaseNotificationInterface['updateNotification'];
  deleteNotification: UseDatabaseNotificationInterface['deleteNotification'];
  allFormsCache: UseDatabaseFormInterface['allFormsCache'];
}

// ----------------------------------------------------------------------

const Notification: React.FC<NotificationProps> = ({ currentUser, notifications, notificationsList, updateNotification, deleteNotification, allFormsCache }) => {
  const [userNotifications, setUserNotifications] = useState<NotificationInterface[]>([]);

  const isShowDialog = useBoolean(false);

  const totalUnReadNotifications = useMemo(() => {
    const filtered = userNotifications.filter((n) => !n.isRead).length;
    return filtered > 99 ? '99+' : filtered;
  }, [userNotifications]);

  useEffect(() => {
    if (currentUser?.databaseUsers?.role === 'parent') {
      notifications({ targetRole: 'parent', userId: currentUser?.databaseUsers?.id, perPage: 50 });
      return;
    }

    notifications({ targetRole: currentUser?.databaseUsers?.role });
  }, [currentUser?.databaseUsers?.id, currentUser?.databaseUsers?.role, notifications]);

  useEffect(() => {
    if (currentUser?.databaseUsers?.role === 'teacher') {
      const parentOnlyNotifications = notificationsList.filter((n) => n.userId === '');
      setUserNotifications(parentOnlyNotifications);
      return;
    }

    setUserNotifications(notificationsList);
  }, [currentUser?.databaseUsers?.role, notificationsList]);

  const onReadAllNotifications = useCallback(async () => {
    if (!userNotifications.length) return;

    const unread = userNotifications.filter((n) => !n.isRead);
    if (!unread.length) return;

    const results = await Promise.allSettled(unread.map((n) => updateNotification(n.id, { isRead: true })));

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      console.error(`${failed.length} notifications failed to update`);
    }
  }, [updateNotification, userNotifications]);

  const onDeleteAllNotifications = useCallback(async () => {
    if (!userNotifications.length) return;

    const results = await Promise.allSettled(userNotifications.map((n) => deleteNotification(n.id)));

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length) {
      console.error(`${failed.length} notifications failed to delete`);
    }
  }, [deleteNotification, userNotifications]);

  return (
    <>
      <Button onClick={isShowDialog.onTrue} variant="gost" className="relative rounded-full p-2 transition hover:bg-white/10">
        {!!totalUnReadNotifications && (
          <span className="absolute right-0 top-0 flex min-h-[22px] min-w-[22px] items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-semibold leading-none text-white shadow-md">
            {totalUnReadNotifications}
          </span>
        )}

        <Icon icon="mingcute:notification-line" width={28} className="text-white" />
      </Button>

      <DialogGeneral state={isShowDialog} containerClassName="top-[10%] right-[5%] md:right-[12%]" className="overflow-hidden p-0 md:w-[520px]">
        <div className="bg-gradient-to-r from-primary-1 to-primary-3 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-semibold">Notifikasi</p>
              <p className="mt-1 text-sm text-white/80">Lihat aktivitas terbaru dari sistem.</p>
            </div>

            {totalUnReadNotifications ? (
              <span className="flex min-h-8 items-center justify-center text-nowrap rounded-full bg-white/15 px-3 text-sm font-semibold backdrop-blur">{totalUnReadNotifications} baru</span>
            ) : (
              <span className="flex min-h-8 items-center justify-center rounded-full bg-white/15 px-3 text-sm font-medium backdrop-blur">Semua terbaca</span>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!!totalUnReadNotifications && (
              <Button
                onClick={onReadAllNotifications}
                variant="gost"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
              >
                Baca semua
              </Button>
            )}

            {userNotifications.length > 0 && !totalUnReadNotifications && (
              <Button
                onClick={onDeleteAllNotifications}
                variant="gost"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/15"
              >
                Hapus semua
              </Button>
            )}
          </div>
        </div>

        <RenderItems userNotifications={userNotifications} updateNotification={updateNotification} allFormsCache={allFormsCache} />
      </DialogGeneral>
    </>
  );
};

function RenderProfile({ username = '?' }: { username: string }) {
  return (
    <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-1 to-primary-3 font-bold text-white shadow-sm ring-1 ring-black/5">{fFirstChar(username)}</div>
  );
}

function RenderItems({
  userNotifications,
  updateNotification,
  allFormsCache,
}: {
  userNotifications: NotificationInterface[];
  updateNotification: UseDatabaseNotificationInterface['updateNotification'];
  allFormsCache: UseDatabaseFormInterface['allFormsCache'];
}) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isAtTop, setIsAtTop] = useState(true);

  const containerRef = useRef<HTMLDivElement | null>(null);

  const formMap = useMemo(() => new Map<string, FormInterface>((allFormsCache ?? []).map((f) => [f.id, f])), [allFormsCache]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const checkOverflow = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight);
    };

    checkOverflow();

    const ro = new ResizeObserver(() => checkOverflow());
    ro.observe(el);

    const onWindowResize = () => checkOverflow();
    window.addEventListener('resize', onWindowResize);

    const onScroll = () => setIsAtTop(el.scrollTop === 0);
    el.addEventListener('scroll', onScroll);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', onWindowResize);
      el.removeEventListener('scroll', onScroll);
    };
  }, []);

  const onReadNotification = useCallback(
    async (id: string, currentStatus: boolean, formId: string) => {
      if (!id || !formId) return;

      try {
        if (!currentStatus) {
          await updateNotification(id, { isRead: true });
        }
      } catch (error) {
        console.error('Failed to update notification:', error);
      }
    },
    [updateNotification]
  );

  if (!userNotifications.length) {
    return (
      <div className="flex min-h-[220px] items-center justify-center px-6 py-8">
        <div className="text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-primary-1/10 text-primary-3">
            <Icon icon="mingcute:notification-line" width={28} />
          </div>
          <p className="text-base font-medium text-slate-700">Tidak ada notifikasi saat ini</p>
          <p className="mt-1 text-sm text-slate-500">Saat ada aktivitas baru, semuanya akan muncul di sini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white">
      <div ref={containerRef} className="max-h-[58vh] overflow-y-auto px-3 py-3" aria-label="List of notifications">
        <div className="space-y-2">
          {userNotifications.map((n) => {
            const currentForm = formMap.get(n.formId);
            const isUnread = !n.isRead;

            return (
              <Button
                key={n.id}
                onClick={() => onReadNotification(n.id, n.isRead, n.formId)}
                variant="gost"
                className={twMerge(
                  'w-full rounded-2xl border border-transparent px-3 py-3 text-left font-normal transition-all duration-200 hover:border-primary-1/20 hover:bg-slate-50',
                  isUnread ? 'bg-primary-1/8 shadow-sm' : 'bg-white'
                )}
              >
                <div className="flex gap-3">
                  <div className="relative shrink-0">
                    <RenderProfile username={n.name} />
                    {isUnread && <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-white bg-primary-2" />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 leading-6 text-slate-700">
                        <strong className="font-semibold text-slate-900">{n.name}</strong> <span>{n.description}</span> <strong className="font-semibold text-primary-3">{currentForm?.title}</strong>
                      </p>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">{fToNow(n.createdAt)}</span>

                      {isUnread && <span className="rounded-full bg-primary-1/10 px-2.5 py-1 text-[11px] font-semibold text-primary-3">Baru</span>}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>
      </div>

      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent to-white transition-opacity duration-200 ${
          isOverflowing && isAtTop ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
}

export default Notification;
