import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
// routes
import { paths } from '/src/routes/paths';
// components
import { Button } from '/src/components/button';
//
import StudentTable from '../student-table';
import StudentFilter from '../student-filter';

// ----------------------------------------------------------------------

export interface FilterInterface {
  search?: string;
  class?: string;
}

// ----------------------------------------------------------------------

const StudentView: React.FC = () => {
  const [filters, setFilters] = useState<FilterInterface>({ search: '', class: undefined });

  const { students, studentsList, page, perPage, nextPage, prevPage, totalCount, isLoading, subscribePage, deleteStudent, createStudent } = useDatabaseStudent();

  const { allUsersCache } = useDatabaseUser();

  // FETCH
  useEffect(() => {
    students({ search: filters.search, class: filters.class });
  }, [filters.class, filters.search, students]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Manajemen</p>

          <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Daftar Siswa</h1>

          <p className="mt-2 text-sm text-slate-500">Kelola data siswa, informasi kelas, dan seluruh data peserta didik.</p>
        </div>

        <Button
          component="RouterLink"
          href={paths.dashboard.student.create}
          className="flex items-center justify-center gap-2 rounded-2xl bg-primary-1 px-5 py-3 font-medium shadow-lg shadow-green-700/20 transition-all hover:-translate-y-0.5 hover:bg-primary-3"
        >
          <Icon icon="mingcute:add-fill" width={20} />

          <span>Tambah Siswa</span>
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <StudentFilter studentsList={studentsList} usersList={allUsersCache} filters={filters} setFilters={setFilters} createStudent={createStudent} />

        <StudentTable
          studentsList={studentsList}
          page={page}
          perPage={perPage}
          totalCount={totalCount}
          isLoading={isLoading}
          students={students}
          onNext={nextPage}
          onPrev={prevPage}
          subscribePage={subscribePage}
          onDeleteStudent={deleteStudent}
        />
      </div>
    </section>
  );
};

export default StudentView;
