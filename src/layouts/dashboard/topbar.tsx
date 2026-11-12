import React, { useCallback } from 'react';
import { Icon } from '@iconify/react';

// routes
import { paths } from '/src/routes/paths';

// hooks
import { useResponsive } from '/src/hooks/use-responsive';
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseForm } from '/src/hooks/use-database-form';
import { useDatabaseNotification } from '/src/hooks/use-database-notification';

// components
import { Image } from '/src/components/image';
import { Button } from '/src/components/button';

// _common
import Notification from '../_common/notification';

// ----------------------------------------------------------------------

interface TopbarProps {
  onOpenSidebar: () => void;
}

// ----------------------------------------------------------------------

const Topbar: React.FC<TopbarProps> = ({ onOpenSidebar }) => {
  const { mdUp } = useResponsive();
  const { currentUser, isLoadingUser } = useDatabaseUser();
  const accessToken = sessionStorage.getItem('accessToken');

  const { notifications, notificationsList, updateNotification, deleteNotification } = useDatabaseNotification();

  const { allFormsCache } = useDatabaseForm();

  const handleClickOpenSidebar = useCallback(() => {
    onOpenSidebar();
  }, [onOpenSidebar]);

  return (
    <nav
      id="dashboard-navigation-topbar"
      className="fixed top-0 z-[999] flex h-[84px] w-full items-center justify-between border-b border-white/10 bg-[#56355F]/95 px-4 shadow-[0_10px_30px_rgba(86,53,95,0.20)] backdrop-blur-xl transition-all duration-300 sm:px-6 md:px-8"
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile sidebar button */}
        <Button
          id="buttonOpenSidebar"
          onClick={handleClickOpenSidebar}
          variant="gost"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:border-[#F9AA75]/30 hover:bg-[#56357F]/50 hover:text-[#F9AA75] lg:hidden"
        >
          <Icon icon="mdi:hamburger-menu" width={28} />
        </Button>

        {/* Logo */}
        <Button component="RouterLink" href={paths.main.root} variant="gost" className="flex w-fit items-center gap-3 rounded-xl px-2 py-1">
          <Image src={mdUp ? '/favicon/logo_full.png' : '/favicon/logo_single.png'} alt="khoiru-ummah" className="h-[40px] w-[40px] object-contain md:w-[180px] md:object-cover" />
        </Button>
      </div>

      {/* Right section */}
      {!isLoadingUser &&
        (currentUser && accessToken ? (
          <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
            {/* Notification */}
            <Notification
              currentUser={currentUser}
              notifications={notifications}
              notificationsList={notificationsList}
              updateNotification={updateNotification}
              deleteNotification={deleteNotification}
              allFormsCache={allFormsCache}
            />

            {/* Profile */}
            <Button
              component="RouterLink"
              href={paths.dashboard.profile.root}
              variant="gost"
              className="flex max-w-[160px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 transition hover:border-[#F9AA75]/30 hover:bg-[#56357F]/50 md:max-w-[260px] lg:max-w-[320px]"
            >
              {/* Avatar */}
              <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/90 ring-2 ring-[#F9AA75]/20">
                <Image src={currentUser.photoURL || '/assets/images/image-7.png'} alt="me" className="h-full w-full object-cover" />
              </div>

              {/* User information */}
              <div className="hidden min-w-0 flex-col items-start truncate md:flex">
                <p className="w-full truncate text-left font-poppins text-sm font-semibold text-white">{currentUser.databaseUsers?.name}</p>

                <p className="text-xs text-white/65">
                  {(currentUser.databaseUsers?.role === 'parent' && 'Wali Siswa') ||
                    (currentUser.databaseUsers?.role === 'teacher' && 'Guru') ||
                    (currentUser.databaseUsers?.role === 'admin' && 'Admin')}
                </p>
              </div>

              {/* Online indicator */}
              <span className="ml-1 hidden h-2 w-2 rounded-full bg-[#A8CF45] shadow-[0_0_0_4px_rgba(168,207,69,0.14)] md:inline-block" />
            </Button>
          </div>
        ) : (
          /* Login */
          <div className="flex items-center gap-3">
            <Button
              component="RouterLink"
              href={paths.auth.login}
              variant="gost"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 font-medium text-white transition hover:border-[#F9AA75]/30 hover:bg-[#56357F]/50 hover:text-[#F9AA75]"
            >
              Masuk
            </Button>
          </div>
        ))}
    </nav>
  );
};

export default Topbar;
