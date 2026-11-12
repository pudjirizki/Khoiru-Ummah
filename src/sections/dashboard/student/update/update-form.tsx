import React, { useCallback, useEffect, useMemo } from 'react';
import { useForm, Controller, RegisterOptions } from 'react-hook-form';
// hooks
import { UseDatabaseUserInterface } from '/src/hooks/use-database-user';
// routes
import { paths } from '/src/routes/paths';
import { useRouter } from '/src/routes/hooks';
// interfaces
import { PayloadUpdateStudentInterface, StudentInterface } from '/src/interfaces/student';
// utils
import { sanitizeToString } from '/src/utils/format-sanitize';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { InputField, ErrorMessage, SelectField } from '/src/components/form';

// ----------------------------------------------------------------------

interface OptionSelectInterface {
  label: string;
  value: string;
}

interface FormData {
  parentId: OptionSelectInterface | undefined;
  nis: string;
  name: string;
  class: OptionSelectInterface | undefined;
}

interface UpdateFormProps {
  currentStudent: StudentInterface | null;
  usersList: UseDatabaseUserInterface['usersList'];
  onUpdateStudent: (id: string, payload: Partial<Omit<StudentInterface, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<StudentInterface | null>;
}

// ----------------------------------------------------------------------

const classOptions: OptionSelectInterface[] = [
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
];

// ----------------------------------------------------------------------

const UpdateForm: React.FC<UpdateFormProps> = ({ currentStudent, usersList, onUpdateStudent }) => {
  const { enqueueSnackbar } = useSnackbar();

  const router = useRouter();

  const parentOptions = useMemo(
    () =>
      usersList.map((u) => ({
        value: u.id,
        label: u.name,
      })),
    [usersList]
  );

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    criteriaMode: 'all',
    defaultValues: {
      parentId: undefined,
      nis: currentStudent?.identityNumber || '',
      name: currentStudent?.name || '',
      class: undefined,
    },
  });

  // OPTIONS KELAS
  const filteredClassOptions = useMemo(() => {
    if (!currentStudent?.class) return classOptions;

    const currentClass = Number(currentStudent.class);

    return classOptions.filter((option) => Number(option.value) >= currentClass);
  }, [currentStudent?.class]);

  // DEFAULT VALUES
  useEffect(() => {
    if (!currentStudent) return;

    const selectedClass = classOptions.find((option) => option.value === currentStudent.class);

    const selectedParent = parentOptions.find((option) => option.value === currentStudent.parentId);

    setValue('class', selectedClass);
    setValue('parentId', selectedParent);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStudent, parentOptions]);

  const handleClickSubmit = useCallback(
    async (data: FormData) => {
      try {
        if (!currentStudent?.id) return;

        const formData: PayloadUpdateStudentInterface = {
          parentId: (data.parentId?.value as string) ?? '',
          identityNumber: sanitizeToString(data.nis),
          name: sanitizeToString(data.name),
          nameLowercase: sanitizeToString(data.name.toLowerCase()),
          class: data.class?.value as string,
        };

        await onUpdateStudent(currentStudent.id, formData);

        enqueueSnackbar('Siswa berhasil diubah');
        reset();
        router.push(paths.dashboard.student.root);
      } catch (error: any) {
        enqueueSnackbar(error.message, { variant: 'error' });
        console.error(error);
      }
    },
    [currentStudent?.id, enqueueSnackbar, onUpdateStudent, reset, router]
  );

  const controllers: {
    name: 'nis' | 'name' | 'class' | 'parentId';
    rules: RegisterOptions<FormData>;
    options?: OptionSelectInterface[];
  }[] = [
    {
      name: 'nis',
      rules: { required: 'Harap isi bidang NIS.' },
    },
    {
      name: 'class',
      rules: { required: 'Harap isi bidang kelas.' },
      options: filteredClassOptions,
    },
    {
      name: 'name',
      rules: { required: 'Harap isi bidang nama lengkap.' },
    },
    {
      name: 'parentId',
      rules: { required: 'Harap pilih wali siswa.' },
      options: parentOptions,
    },
  ];

  return (
    <form onSubmit={handleSubmit(handleClickSubmit)} className="flex w-full flex-col items-center justify-center gap-4 rounded-lg bg-white p-5 shadow-lg drop-shadow-md">
      <div className="grid w-full grid-cols-1 gap-x-10 gap-y-4 md:grid-cols-2">
        {controllers.map((controller, index) => (
          <Controller
            key={index}
            control={control}
            name={controller.name}
            rules={controller.rules}
            render={({ field: { onChange, value } }) => (
              <div>
                {controller.name === 'nis' && (
                  <InputField
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
                    }}
                    value={value as string}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    label="NIS (Nomor Induk Siswa)"
                    onChange={onChange}
                    name={controller.name}
                    placeholder="Masukan NIS"
                  />
                )}

                {controller.name === 'name' && <InputField label="Nama Lengkap" onChange={onChange} value={value as string} name={controller.name} placeholder="Masukan nama lengkap" />}

                {controller.name === 'class' && (
                  <SelectField
                    placeholder="Pilih kelas"
                    options={controller.options}
                    onChange={onChange}
                    value={value as OptionSelectInterface}
                    label="Kelas"
                    name={controller.name}
                    isSearchable={false}
                    components={{
                      IndicatorSeparator: () => null,
                    }}
                  />
                )}

                {controller.name === 'parentId' && (
                  <SelectField
                    placeholder="Pilih wali siswa"
                    options={controller.options}
                    onChange={onChange}
                    value={value as OptionSelectInterface}
                    label="Wali Siswa (wajib)"
                    name={controller.name}
                    components={{
                      IndicatorSeparator: () => null,
                    }}
                  />
                )}

                <ErrorMessage errors={errors} name={controller.name} />
              </div>
            )}
          />
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting} fullWidth className="px-10 py-3">
        Simpan Perubahan
      </Button>
    </form>
  );
};

export default UpdateForm;
