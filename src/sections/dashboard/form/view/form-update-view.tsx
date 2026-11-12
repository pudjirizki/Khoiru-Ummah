import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
// context
import { useFormContext } from '/src/context/form';
// routes
import { paths } from '/src/routes/paths';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { useFinalForm } from '/src/hooks/use-final-form';
import { useDatabaseUser } from '/src/hooks/use-database-user';
// interfaces
import { FinalFormInterface, TempAssessmentFinalFormInterface, TempGeneralFinalFormInterface } from '/src/interfaces/final-form';
// utils
import { fDecrypt } from '/src/utils/format-encrypt';
// config-global
import { FORM_KEY } from '/src/config-global';
// components
import { Button } from '/src/components/button';
import { LoadingScreen } from '/src/components/loading-screen';
//
import UpdateGeneralForm from '../update/update-general-form';
import UpdateAssessmentForm from '../update/update-assessment-form';
import { useDatabaseCriteria } from '/src/hooks/use-database-criteria';
import { useDatabaseQuestion } from '/src/hooks/use-database-question';

// ----------------------------------------------------------------------

export interface FormContextStateInterface {
  currentTab: 'general' | 'assessment';
  generalForm: TempGeneralFinalFormInterface | null;
  assessmentForm: TempAssessmentFinalFormInterface | null;
}

interface FormUpdateViewProps {
  slug: string;
}

// ----------------------------------------------------------------------

const FormUpdateView: React.FC<FormUpdateViewProps> = ({ slug }) => {
  const [currentForm, setCurrentForm] = useState<FinalFormInterface | null>(null);

  const { currentTab, generalForm, assessmentForm, onUpdateCurrentTab, onUpdateGeneralForm, onReset, onUpdateAssessmentForm } = useFormContext();

  const { updateFinalForm, fetchFinalFormById } = useFinalForm();

  const { currentUser } = useDatabaseUser();

  const { deleteCriteria } = useDatabaseCriteria();

  const { deleteQuestion } = useDatabaseQuestion();

  const isLoadingForm = useBoolean(true);

  // CURRENT FORM
  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        isLoadingForm.onTrue();
        const res = await fetchFinalFormById(slug);
        if (mounted) setCurrentForm(res ?? null);
      } catch (err) {
        console.error('fetchFinalFormById error', err);
        if (mounted) setCurrentForm(null);
      } finally {
        if (mounted) isLoadingForm.onFalse();
      }
    };

    fetch();

    return () => {
      mounted = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFinalFormById, slug]);

  const derivedFormContext = useMemo(() => {
    try {
      return {
        currentTab,
        generalForm: generalForm ? (fDecrypt(generalForm, FORM_KEY) as TempGeneralFinalFormInterface) : null,
        assessmentForm: assessmentForm ? (fDecrypt(assessmentForm, FORM_KEY) as TempAssessmentFinalFormInterface) : null,
      };
    } catch (err) {
      console.error('decrypt error', err);
      return { currentTab, generalForm: null, assessmentForm: null };
    }
  }, [currentTab, generalForm, assessmentForm]);

  // UPDATE GENERAL FORM AND ASSESSMENT FORM
  useEffect(() => {
    const updateAllForm = () => {
      if (currentForm) {
        const generalFormResult: TempGeneralFinalFormInterface = {
          title: currentForm.title,
          description: currentForm.description,
          class: currentForm.class,
        };

        const assessmentFormResult: TempAssessmentFinalFormInterface = {
          notes: currentForm.notes,
          criterias: currentForm.criterias,
        };

        onUpdateGeneralForm(generalFormResult);
        onUpdateAssessmentForm(assessmentFormResult);
      }
    };

    updateAllForm();
  }, [currentForm, onUpdateAssessmentForm, onUpdateGeneralForm]);

  if (isLoadingForm.value) return <LoadingScreen />;

  if (!currentForm) return null;

  return (
    <section>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
        <Button component="RouterLink" href={paths.dashboard.form.root} variant="gost" className="mb-4 flex w-fit items-center gap-2 rounded-xl px-0 text-slate-500 transition hover:text-primary-1">
          <Icon icon="ic:round-arrow-back-ios" width={18} />

          <span className="text-sm font-medium">Kembali ke Daftar Formulir</span>
        </Button>

        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Manajemen Formulir</p>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-1/10">
              <Icon icon="solar:document-text-bold" width={24} className="text-primary-1" />
            </div>

            <div>
              <h1 className="font-poppins text-3xl font-bold text-slate-800">Edit Formulir</h1>

              <p className="mt-1 text-sm text-slate-500">Perbarui informasi formulir yang dipilih dan simpan perubahan setelah selesai.</p>
            </div>
          </div>
        </div>
      </div>

      {currentTab === 'general' && (
        <div className="mt-5 flex w-full flex-col justify-center gap-4 rounded-lg bg-white p-5 shadow-lg drop-shadow-md">
          <div className="flex flex-row items-center justify-between border-b-2 border-black/60 pb-2">
            <p className="text-lg font-semibold">Umum</p>
            <p className="font-inter text-lg font-medium">1/2</p>
          </div>

          <UpdateGeneralForm formContextState={derivedFormContext} onUpdateCurrentTab={onUpdateCurrentTab} onUpdateGeneralForm={onUpdateGeneralForm} onReset={onReset} />
        </div>
      )}

      {currentTab === 'assessment' && (
        <div className="mt-5 flex w-full flex-col justify-center gap-4 rounded-lg bg-white p-5 shadow-lg drop-shadow-md">
          <div className="flex flex-row items-center justify-between border-b-2 border-black/60 pb-2">
            <p className="text-lg font-semibold">Penilaian</p>
            <p className="font-inter text-lg font-medium">2/2</p>
          </div>

          <UpdateAssessmentForm
            currentForm={currentForm}
            formContextState={derivedFormContext}
            currentUser={currentUser}
            onUpdateCurrentTab={onUpdateCurrentTab}
            onUpdateForm={updateFinalForm}
            onDeleteCriteria={deleteCriteria}
            onDeleteQuestion={deleteQuestion}
            onReset={onReset}
          />
        </div>
      )}
    </section>
  );
};

export default FormUpdateView;
