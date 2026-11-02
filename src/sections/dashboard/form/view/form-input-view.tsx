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

  const { allUsersCache, currentUser } = useDatabaseUser();

  const { allStudentsCache } = useDatabaseStudent();

  const { fetchFinalFormById } = useFinalForm();

  const { allFinalAssessmentsCache, createFinalAssessment } = useFinalAssessment();

  // GET CURRENT FORM
  useEffect(() => {
    const fetch = async () => {
      const res = await fetchFinalFormById(slug);

      setCurrentForm(res);
    };

    fetch();
  }, [fetchFinalFormById, slug]);

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

      {currentForm && currentUser && (
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
