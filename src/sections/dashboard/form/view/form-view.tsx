import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
// context
import { useFormContext } from '/src/context/form';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { useFinalForm } from '/src/hooks/use-final-form';
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
import { useDatabaseAssessment } from '/src/hooks/use-database-assessment';
// interfaces
import { FormInterface } from '/src/interfaces/form';
// routes
import { paths } from '/src/routes/paths';
// components
import { Button } from '/src/components/button';
import { SelectField } from '/src/components/form';
// _common
import { CardSkeleton } from '../_common';
//
import FormList from '../form-list';

// ----------------------------------------------------------------------

const FormView: React.FC = () => {
  const [myForms, setMyForms] = useState<FormInterface[]>([]);

  const [selectedClass, setSelectedClass] = useState<string>('');

  const { allFinalFormsCache, deleteFinalForm } = useFinalForm();

  const { currentUser, allUsersCache } = useDatabaseUser();

  const { allAssessmentsCache } = useDatabaseAssessment();

  const { allStudentsCache } = useDatabaseStudent();

  const { onReset } = useFormContext();

  const isEmpty = useBoolean(false);

  const isLoading = !allFinalFormsCache.length || !allStudentsCache.length || !currentUser;

  const userRole = currentUser?.databaseUsers?.role;

  const parentStudentClasses = useMemo(() => {
    const parentId = currentUser?.databaseUsers?.id;
    if (!parentId) return new Set<string>();

    return new Set(allStudentsCache.filter((student) => student.parentId === parentId).map((student) => student.class));
  }, [allStudentsCache, currentUser?.databaseUsers?.id]);

  const classOptions = useMemo(() => {
    const classes = new Set<string>();

    allFinalFormsCache.forEach((form) => {
      form.class?.forEach((item) => classes.add(item));
    });

    return [
      {
        label: 'Semua Kelas',
        value: '',
      },
      ...Array.from(classes)
        .sort((a, b) => Number(a) - Number(b))
        .map((item) => ({
          label: `Kelas ${item}`,
          value: item,
        })),
    ];
  }, [allFinalFormsCache]);

  // RESET CONTEXT
  useEffect(() => {
    onReset();
  }, [onReset]);

  // GET MY FORMS
  useEffect(() => {
    if (!allFinalFormsCache?.length) {
      setMyForms([]);
      isEmpty.onTrue();
      return;
    }

    let result = [...allFinalFormsCache];

    if (parentStudentClasses.size > 0) {
      result = result.filter((form) => form.class?.some((cls) => parentStudentClasses.has(cls)));
    }

    if (selectedClass) {
      result = result.filter((form) => form.class?.includes(selectedClass));
    }

    setMyForms(result);

    if (result.length) {
      isEmpty.onFalse();
    } else {
      isEmpty.onTrue();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFinalFormsCache, parentStudentClasses, selectedClass]);

  return (
    <section>
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-6 shadow-md md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Manajemen</p>

          <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Formulir</h1>

          <p className="mt-2 text-sm text-slate-500">Kelola seluruh formulir penilaian dan data yang tersedia.</p>
        </div>

        {(userRole === 'teacher' || userRole === 'admin') && (
          <Button
            component="RouterLink"
            href={paths.dashboard.form.create}
            className="flex items-center justify-center gap-2 rounded-2xl bg-primary-1 px-5 py-3 font-medium shadow-lg shadow-green-700/20 transition-all hover:-translate-y-0.5 hover:bg-primary-3"
          >
            <Icon icon="mingcute:add-fill" width={20} />

            <span>Tambah Formulir</span>
          </Button>
        )}
      </div>

      {/* FILTER CLASS */}
      <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Filter</p>

            <p className="text-xs text-slate-500">Tampilkan formulir berdasarkan kelas.</p>
          </div>

          <div className="w-full md:w-72">
            <SelectField
              placeholder="Pilih kelas"
              options={classOptions}
              value={classOptions.find((item) => item.value === selectedClass)}
              onChange={(option) => setSelectedClass(option?.value ?? '')}
              isSearchable={false}
            />
          </div>
        </div>
      </div>

      {isLoading && <CardSkeleton className="mt-6" />}

      {!isLoading && isEmpty.value && <p className="mt-5">Tidak ada data</p>}

      {!isLoading && !!myForms.length && (
        <FormList forms={myForms} assessments={allAssessmentsCache} currentUser={currentUser} users={allUsersCache} students={allStudentsCache} onDeleteForm={deleteFinalForm} />
      )}
    </section>
  );
};

export default FormView;
