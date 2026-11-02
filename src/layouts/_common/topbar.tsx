import React from 'react';
// routes
import { paths } from '/src/routes/paths';
// hooks
import { useResponsive } from '/src/hooks/use-responsive';
import { useDatabaseUser } from '/src/hooks/use-database-user';
// components
import { Image } from '/src/components/image';
import { Button } from '/src/components/button';

// ----------------------------------------------------------------------

const Topbar: React.FC = () => {
  const { mdUp } = useResponsive();

  const { currentUser, isLoadingUser } = useDatabaseUser();

  const accessToken = sessionStorage.getItem('accessToken');

  return (
    <nav
      id="navigation-topbar"
      className="absolute left-[50%] top-0 z-[998] flex h-[80px] w-full translate-x-[-50%] flex-row items-center justify-between bg-transparent px-7 transition-all duration-300 2xl:container md:px-10"
    >
      <Button component="RouterLink" href={paths.main.root} variant="gost" className="flex items-center justify-center gap-3">
        <Image src={mdUp ? '/favicon/logo_full.png' : '/favicon/logo_single.png'} alt="khoiru-ummah" className="h-[40px] w-[40px] object-cover md:h-[50px] md:w-[200px]" />
      </Button>

      {!isLoadingUser && currentUser && accessToken && (
        <Button component="RouterLink" href={paths.dashboard.root} variant="gost" className="flex max-w-[150px] flex-row items-center justify-center gap-3 md:max-w-[250px] lg:max-w-[300px]">
          <div className="flex h-10 min-h-10 w-10 min-w-10 items-center justify-center overflow-hidden rounded-full border border-neutral-500 bg-white">
            <Image src={currentUser.photoURL || '/assets/images/image-7.png'} alt="me" className="h-full w-full" />
          </div>

          <div className="flex flex-col items-start truncate">
            <p className="w-full truncate text-left font-semibold text-black">{currentUser.databaseUsers?.name}</p>
            <p className="text-sm text-[#ACACAC]">
              {(currentUser.databaseUsers?.role === 'parent' && 'Orang Tua') || (currentUser.databaseUsers?.role === 'teacher' && 'Guru') || (currentUser.databaseUsers?.role === 'admin' && 'Admin')}
            </p>
          </div>
        </Button>
      )}
    </nav>
  );
};

export default Topbar;
