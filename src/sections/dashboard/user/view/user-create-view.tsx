import React from 'react';
import { Icon } from '@iconify/react';
// routes
import { paths } from '/src/routes/paths';
// components
import { Button } from '/src/components/button';
//
import CreateForm from '../create/create-form';

// ----------------------------------------------------------------------

const UserCreateView: React.FC = () => {
  return (
    <section>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
        <Button component="RouterLink" href={paths.dashboard.user.root} variant="gost" className="mb-5 flex w-fit items-center gap-2 text-slate-500 transition hover:text-primary-1">
          <Icon icon="ic:round-arrow-back-ios" width={18} />

          <span className="text-sm font-medium">Kembali ke Daftar Pengguna</span>
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-1/10">
            <Icon icon="mingcute:user-add-fill" width={32} className="text-primary-1" />
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Manajemen Pengguna</p>

            <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Tambah Pengguna</h1>

            <p className="mt-2 text-sm text-slate-500">Tambahkan akun baru dan tentukan peran pengguna sesuai kebutuhan.</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <CreateForm />
      </div>
    </section>
  );
};

export default UserCreateView;
