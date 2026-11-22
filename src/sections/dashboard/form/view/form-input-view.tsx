import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
// hooks
import { useFinalForm } from '/src/hooks/use-final-form';
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
import { useFinalAssessment } from '/src/hooks/use-final-assessment';
// routes
import { paths } from '/src/routes/paths';
// interfaces
import { FinalFormInterface, TempAssessmentFinalFormInterface, TempGeneralFinalFormInterface } from '/src/interfaces/final-form';
// components
import { Button } from '/src/components/button';
//
import InputForm from '../input/input-form';

// ----------------------------------------------------------------------

export interface FormContextStateInterface {
  currentTab: 'general' | 'assessment';
  generalForm: TempGeneralFinalFormInterface | null;
  assessmentForm: TempAssessmentFinalFormInterface | null;
}

// ----------------------------------------------------------------------

interface FormInputViewProps {
  slug: string;
}

// ----------------------------------------------------------------------

const FormInputView: React.FC<FormInputViewProps> = ({ slug }) => {
  const [currentForm, setCurrentForm] = useState<FinalFormInterface | null>(null);
  const [isLoadingForm, setIsLoadingForm] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { allUsersCache, currentUser, isLoadingUser } = useDatabaseUser();

  const { allStudentsCache } = useDatabaseStudent();

  const { fetchFinalFormById } = useFinalForm();

  const { allFinalAssessmentsCache, createFinalAssessment } = useFinalAssessment();

  // GET CURRENT FORM
  useEffect(() => {
    let isMounted = true;

    const fetch = async () => {
      setCurrentForm(null);
      setLoadError(null);
      setIsLoadingForm(true);

      try {
        const res = await fetchFinalFormById(slug);
        if (!isMounted) return;

        if (!res) {
          setLoadError('Formulir tidak ditemukan atau tidak dapat diakses.');
        }
        setCurrentForm(res);
      } catch (error) {
        if (!isMounted) return;
        if (error instanceof Error) {
          setLoadError(error.message);
        } else if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
          setLoadError(error.message);
        } else {
          setLoadError(String(error));
        }
      } finally {
        if (isMounted) setIsLoadingForm(false);
      }
    };

    void fetch();

    return () => {
      isMounted = false;
    };
  }, [fetchFinalFormById, slug]);

  const questionCount =
    currentForm?.criterias.reduce((total, criteria) => total + (criteria.questions?.length ?? 0), 0) ?? 0;
  const canAssess = currentUser?.databaseUsers?.role === 'teacher' || currentUser?.databaseUsers?.role === 'parent';

  return (
    <section>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
        <Button component="RouterLink" href={paths.dashboard.form.root} variant="gost" className="mb-4 flex w-fit items-center gap-2 rounded-xl px-0 text-slate-500 transition hover:text-primary-1">
          <Icon icon="ic:round-arrow-back-ios" width={18} />

          <span className="text-sm font-medium">Kembali ke Daftar Formulir</span>
        </Button>

        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Formulir Penilaian</p>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-1/10">
              <Icon icon="solar:clipboard-check-bold" width={24} className="text-primary-1" />
            </div>

            <div>
              <h1 className="font-poppins text-3xl font-bold text-slate-800">Pengisian Formulir</h1>

              <p className="mt-1 text-sm text-slate-500">Lengkapi seluruh pertanyaan dengan jawaban yang sesuai sebelum mengirim formulir.</p>
            </div>
          </div>
        </div>
      </div>

      {(isLoadingForm || isLoadingUser) && (
        <p role="status" className="mt-5 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Memuat data formulir...
        </p>
      )}

      {!isLoadingForm && loadError && (
        <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          Formulir tidak dapat dimuat: {loadError}
        </div>
      )}

      {!isLoadingForm && !isLoadingUser && !loadError && !currentUser?.databaseUsers && (
        <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          Data akun Anda tidak dapat dimuat. Silakan muat ulang halaman atau hubungi admin.
        </div>
      )}

      {!isLoadingUser && currentUser?.databaseUsers?.role === 'admin' && (
        <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Akun admin hanya digunakan untuk mengelola data. Penilaian siswa dilakukan oleh guru dan wali siswa.
        </div>
      )}

      {!isLoadingForm && !isLoadingUser && canAssess && currentForm && questionCount === 0 && (
        <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          Formulir ini belum memiliki pertanyaan penilaian. Hubungi guru atau admin untuk melengkapi kriteria dan pertanyaannya.
        </div>
      )}

      {!isLoadingForm && !isLoadingUser && canAssess && currentForm && questionCount > 0 && (
        <InputForm
          currentForm={currentForm}
          currentUser={currentUser}
          users={allUsersCache}
          students={allStudentsCache}
          assessments={allFinalAssessmentsCache}
          onCreateAssessment={createFinalAssessment}
        />
      )}
    </section>
  );
};

export default FormInputView;
