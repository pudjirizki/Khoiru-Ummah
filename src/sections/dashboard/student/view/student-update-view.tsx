import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
// hooks
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
// routes
import { paths } from '/src/routes/paths';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
// components
import { Button } from '/src/components/button';
import { LoadingScreen } from '/src/components/loading-screen';
//
import UpdateForm from '../update/update-form';

// ----------------------------------------------------------------------

interface StudentUpdateViewProps {
  slug: string;
}

// ----------------------------------------------------------------------

const StudentUpdateView: React.FC<StudentUpdateViewProps> = ({ slug }) => {
  const [currentStudent, setCurrentStudent] = useState<StudentInterface | null>(null);

  const { fetchStudentById, updateStudent } = useDatabaseStudent();

  const { users, usersList } = useDatabaseUser();

  // CURRENT STUDENT
  useEffect(() => {
    const fetch = async () => {
      const res = await fetchStudentById(slug);
      setCurrentStudent(res);
    };

    fetch();
  }, [fetchStudentById, slug]);

  // FETCH APIs
  useEffect(() => {
    users({ role: 'parent', perPage: 100, limit: 100 });
  }, [users]);

  return (
    <section>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
        <Button component="RouterLink" href={paths.dashboard.student.root} variant="gost" className="mb-5 flex w-fit items-center gap-2 text-slate-500 transition hover:text-primary-1">
          <Icon icon="ic:round-arrow-back-ios" width={18} />

          <span className="text-sm font-medium">Kembali ke Daftar Siswa</span>
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-1/10">
            <Icon icon="solar:user-id-bold" width={32} className="text-primary-1" />
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Manajemen Siswa</p>

            <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Edit Siswa</h1>

            <p className="mt-2 text-sm text-slate-500">Perbarui data siswa, informasi kelas, dan identitas yang diperlukan.</p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {!currentStudent ? <LoadingScreen /> : <UpdateForm currentStudent={currentStudent} usersList={usersList} onUpdateStudent={updateStudent} />}
      </div>
    </section>
  );
};

export default StudentUpdateView;
