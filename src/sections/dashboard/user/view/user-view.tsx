import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
// context
import { useUserContext } from '/src/context/user';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
// routes
import { paths } from '/src/routes/paths';
// interfaces
import { RoleUserType, StatusUserType } from '/src/interfaces/user';
// components
import { Button } from '/src/components/button';
//
import UserTable from '../user-table';
import UserFilter from '../user-filter';

// ----------------------------------------------------------------------

export interface FilterInterface {
  search?: string;
  role?: RoleUserType;
  status?: StatusUserType;
}

// ----------------------------------------------------------------------

const UserView: React.FC = () => {
  const [filters, setFilters] = useState<FilterInterface>({ search: '', role: undefined, status: undefined });

  const { users, usersList, page, perPage, nextPage, prevPage, totalCount, isLoadingUsers, subscribePage } = useDatabaseUser();

  const { onRegister, onUpdate } = useUserContext();

  // FETCH
  useEffect(() => {
    users({ search: filters.search, role: filters.role, status: filters.status });
  }, [filters.role, filters.search, filters.status, users]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Manajemen</p>

          <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Daftar Pengguna</h1>

          <p className="mt-2 text-sm text-slate-500">Kelola data admin, guru, dan wali siswa dalam satu tempat.</p>
        </div>

        <Button
          component="RouterLink"
          href={paths.dashboard.user.create}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-1 px-5 py-3 font-medium shadow-lg shadow-green-700/20 transition-all hover:-translate-y-0.5 hover:bg-primary-3"
        >
          <Icon icon="mingcute:add-fill" width={20} />
          <span>Tambah Pengguna</span>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <UserFilter usersList={usersList} filters={filters} setFilters={setFilters} onRegister={onRegister} />

        <UserTable
          usersList={usersList}
          page={page}
          perPage={perPage}
          totalCount={totalCount}
          isLoadingUsers={isLoadingUsers}
          users={users}
          onUpdate={onUpdate}
          onNext={nextPage}
          onPrev={prevPage}
          subscribePage={subscribePage}
        />
      </div>
    </section>
  );
};

export default UserView;
