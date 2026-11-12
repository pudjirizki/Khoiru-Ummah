import React, { useEffect, useState } from 'react';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
// interfaces
import { UserInterface } from '/src/interfaces/user';
// utils
import { fCapitalizeFirstLetter } from '/src/utils/format-string';
// components
import { Image } from '/src/components/image';
import { LoadingScreen } from '/src/components/loading-screen';
//
import ProfileForm from '../profile-form';

// ----------------------------------------------------------------------

const ProfileView: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<UserInterface | null>(null);

  const { allStudentsCache } = useDatabaseStudent();

  const { currentUser: current, isLoadingUser, fetchUserById } = useDatabaseUser();

  // CURRENT USER
  useEffect(() => {
    const fetch = async () => {
      if (!current?.databaseUsers?.id) return;

      const res = await fetchUserById(current.databaseUsers.id);
      setCurrentUser(res);
    };

    fetch();
  }, [current?.databaseUsers?.id, fetchUserById]);

  if (isLoadingUser) return <LoadingScreen />;

  if (!currentUser) return null;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Pengaturan Akun</p>

        <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Profil Saya</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-md">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-primary-2/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="h-[140px] w-[140px] overflow-hidden rounded-full border-4 border-white shadow-lg">
              <Image src="/assets/images/image-7.png" alt={currentUser?.name || 'me'} className="h-full w-full object-cover" />
            </div>

            <h2 className="mt-5 text-center font-poppins text-2xl font-bold text-slate-800">{currentUser?.name}</h2>

            <p className="mt-1 rounded-full bg-primary-1/10 px-4 py-1 text-sm font-medium text-primary-1">
              {(currentUser?.role === 'parent' && 'Wali Siswa') || (currentUser?.role === 'teacher' && 'Guru') || (currentUser?.role === 'admin' && 'Admin')}
            </p>

            <div className="mt-8 w-full space-y-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Email</p>
                <p className="truncate font-medium">{currentUser?.email}</p>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Nomor Telepon</p>
                <p className="font-medium">{currentUser?.phoneNumber || '-'}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid w-full grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs text-slate-500">Status</p>

              <p className="font-semibold text-green-600">{fCapitalizeFirstLetter(currentUser?.status)}</p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 text-center">
              <p className="text-xs text-slate-500">Peran</p>

              <p className="font-semibold text-primary-1">{(currentUser?.role === 'parent' && 'Wali') || (currentUser?.role === 'teacher' && 'Guru') || (currentUser?.role === 'admin' && 'Admin')}</p>
            </div>
          </div>
        </div>

        <ProfileForm studentList={allStudentsCache} currentUser={currentUser} />
      </div>
    </section>
  );
};

export default ProfileView;
