import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';
// context
import { useUserContext } from '/src/context/user';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
// routes
import { paths } from '/src/routes/paths';
import { usePathname, useRouter } from '/src/routes/hooks';
// components
import { Image } from '/src/components/image';
import { Button } from '/src/components/button';
//
import { configNavigation, ConfigNavigationInterface } from './config-navigation';

// ----------------------------------------------------------------------

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// ----------------------------------------------------------------------

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
  const [menuBar, setMenuBar] = useState<ConfigNavigationInterface[]>([]);
  const pathname = usePathname();
  const { onLogout } = useUserContext();
  const { currentUser } = useDatabaseUser();
  const router = useRouter();

  useEffect(() => {
    const role = currentUser?.databaseUsers?.role;

    let menus = configNavigation;

    if (role === 'teacher') {
      menus = configNavigation.filter((menu) => menu.title !== 'Pengguna');
    } else if (role !== 'admin') {
      menus = configNavigation.filter((menu) => !['Pengguna', 'Siswa', 'Absensi Guru'].includes(menu.title));
    }

    setMenuBar(menus);
  }, [currentUser]);

  const handleHideSidebar = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleRoute = useCallback(
    (path: string) => {
      router.push(path);
      handleHideSidebar();
    },
    [handleHideSidebar, router]
  );

  const searchBasePath = (fullPath: string) => `/${fullPath.split('/')?.[2]}`;

  const roleLabel = useMemo(() => {
    return (
      (currentUser?.databaseUsers?.role === 'parent' && 'Wali Siswa') ||
      (currentUser?.databaseUsers?.role === 'teacher' && 'Guru') ||
      (currentUser?.databaseUsers?.role === 'admin' && 'Admin') ||
      'Pengguna'
    );
  }, [currentUser?.databaseUsers?.role]);

  return (
    <nav
      id="dashboard-navigation-sidebar"
      className={twMerge(
        `fixed left-0 top-0 z-[1000] flex h-screen w-[284px] flex-col overflow-hidden border-r border-white/10 bg-[#56355F]/95 px-4 pb-5 pt-[92px] shadow-[12px_0_40px_rgba(86,53,95,0.25)] backdrop-blur-xl transition-transform duration-300 ease-out lg:translate-x-0`,
        open ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      {/* Top gradient */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#56357F]/40 to-transparent" />

      {/* Brand */}
      <div className="absolute left-4 top-4 flex items-center gap-3">
        <Button component="RouterLink" href={paths.main.root} variant="gost" className="flex items-center gap-3 rounded-xl px-2 py-1">
          <Image src="/favicon/logo_single.png" alt="khoiru-ummah" className="h-[34px] w-[34px]" />
        </Button>

        <div className="hidden flex-col lg:flex">
          <p className="text-sm font-semibold text-white">Dashboard</p>
          <p className="text-xs text-white/60">{roleLabel}</p>
        </div>
      </div>

      {/* Mobile close button */}
      <Button
        id="buttonHideSidebar"
        onClick={handleHideSidebar}
        variant="gost"
        className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:bg-[#56357F]/50 lg:hidden"
      >
        <Icon icon="mdi:close" width={24} />
      </Button>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
        {/* Main menu */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <div className="mb-2 px-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Menu Utama</p>
            </div>

            {menuBar?.map((menu, i) => {
              const isActive = pathname === menu.path || searchBasePath(pathname) === searchBasePath(menu.path);

              return (
                <Button
                  key={i}
                  onClick={() => handleRoute(menu.path)}
                  variant="gost"
                  className={twMerge(
                    `group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-200`,
                    isActive ? `bg-[#F9AA75] text-[#56355F] shadow-[0_10px_30px_rgba(249,170,117,0.20)]` : `text-white/70 hover:bg-[#56357F]/50 hover:text-white`
                  )}
                >
                  <span className={twMerge(`inline-flex h-10 w-10 items-center justify-center rounded-xl transition`, isActive ? 'bg-[#56355F]/10' : 'bg-white/8 group-hover:bg-[#56357F]/40')}>
                    <Icon icon={menu.icon} width={20} />
                  </span>

                  <span className="flex-1 font-medium">{menu.title}</span>

                  {isActive && <span className="h-2 w-2 rounded-full bg-[#A8CF45]" />}
                </Button>
              );
            })}
          </div>
        </div>

        {/* User section */}
        <div className="shrink-0 space-y-3 border-t border-white/10 bg-[#56355F] pt-3">
          <div className="rounded-2xl border border-white/10 bg-[#56357F]/30 p-4">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/90">
                <Image src={currentUser?.photoURL || '/assets/images/image-7.png'} alt="me" className="h-full w-full object-cover" />
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{currentUser?.databaseUsers?.name || '-'}</p>

                <p className="truncate text-xs text-white/55">{roleLabel}</p>
              </div>
            </div>

            {/* Profile */}
            <Button
              component="RouterLink"
              href={paths.dashboard.profile.root}
              variant="outlined"
              className={twMerge(
                `flex w-full items-center justify-center gap-2 rounded-xl border-white/15 bg-white/5 text-white transition hover:border-[#F9AA75]/50 hover:bg-[#56357F]/50`,
                pathname === paths.dashboard.profile.root && 'border-[#F9AA75] bg-[#F9AA75]/15 text-[#F9AA75]'
              )}
            >
              <span>Profil</span>
              <Icon icon="mingcute:user-setting-fill" width={20} />
            </Button>
          </div>

          {/* Logout */}
          <Button
            id="buttonLogout"
            type="button"
            onClick={onLogout}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#F9AA75] px-4 py-3 font-semibold text-[#56355F] shadow-[0_10px_24px_rgba(249,170,117,0.25)] transition hover:bg-[#ffc097] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <span>Keluar</span>
            <Icon icon="uil:exit" width={20} />
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
