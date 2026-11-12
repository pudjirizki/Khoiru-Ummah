import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
// routes
import { paths } from '/src/routes/paths';
// context
import { useUserContext } from '/src/context/user/user-context';
// interfaces
import { UserInterface } from '/src/interfaces/user';
// components
import { Button } from '/src/components/button';
import { LoadingScreen } from '/src/components/loading-screen';
//
import UpdateForm from '../update/update-form';

// ----------------------------------------------------------------------

interface UserUpdateViewProps {
  slug: string;
}

// ----------------------------------------------------------------------

const UserUpdateView: React.FC<UserUpdateViewProps> = ({ slug }) => {
  const [currentUser, setCurrentUser] = useState<UserInterface | null>(null);

  const { fetchUserById } = useDatabaseUser();

  const { onUpdate } = useUserContext();

  // CURRENT USER
  useEffect(() => {
    const fetch = async () => {
      const res = await fetchUserById(slug);
      setCurrentUser(res);
    };

    fetch();
  }, [fetchUserById, slug]);

  return (
    <section>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
        <Button component="RouterLink" href={paths.dashboard.user.root} variant="gost" className="mb-5 flex w-fit items-center gap-2 rounded-xl px-0 text-slate-500 transition hover:text-primary-1">
          <Icon icon="ic:round-arrow-back-ios" width={18} />

          <span className="text-sm font-medium">Kembali ke Daftar Pengguna</span>
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-1/10">
            <Icon icon="mingcute:user-setting-fill" width={32} className="text-primary-1" />
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Manajemen Pengguna</p>

            <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Edit Pengguna</h1>

            <p className="mt-2 text-sm text-slate-500">Perbarui informasi pengguna yang dipilih dan simpan perubahan setelah selesai.</p>
          </div>
        </div>
      </div>

      <div className="mt-5">{currentUser ? <UpdateForm currentUser={currentUser} onUpdateUser={onUpdate} /> : <LoadingScreen />}</div>
    </section>
  );
};

export default UserUpdateView;
