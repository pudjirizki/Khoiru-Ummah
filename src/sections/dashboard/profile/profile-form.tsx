import React, { useCallback, useMemo } from 'react';
import { useForm, Controller, RegisterOptions } from 'react-hook-form';
// context
import { useUserContext } from '/src/context/user';
// routes
import { useRouter } from '/src/routes/hooks';
// inerfaces
import { StudentInterface } from '/src/interfaces/student';
import { RoleUserType, UserInterface } from '/src/interfaces/user';
import { PayloadUpdateAuthInterface } from '/src/interfaces/authentication';
// utils
import { sanitizeToString } from '/src/utils/format-sanitize';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { InputField, ErrorMessage } from '/src/components/form';

// ----------------------------------------------------------------------

interface OptionSelectInterface {
  label: string;
  value: string;
}

interface GroupedOptionSelectInterface {
  label: string;
  options: OptionSelectInterface[];
}

interface FormData {
  email: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  studentId: string;
}

interface ProfileFormProps {
  studentList: StudentInterface[];
  currentUser: UserInterface;
}

// ----------------------------------------------------------------------

const ProfileForm: React.FC<ProfileFormProps> = ({ studentList, currentUser }) => {
  const { enqueueSnackbar } = useSnackbar();

  const { onUpdate } = useUserContext();

  const router = useRouter();

  const studentName = useMemo(() => {
    const result = [...studentList].filter((s) => s.parentId === currentUser?.id).sort((a, b) => a.class.localeCompare(b.class, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))[0];
    return result;
  }, [currentUser?.id, studentList]);

  const studentNames = useMemo(() => {
    const result = [...studentList]
      .filter((s) => s.parentId === currentUser?.id)
      .sort((a, b) => a.class.localeCompare(b.class, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((s) => s.name);

    return result.join(', ');
  }, [currentUser?.id, studentList]);

  const {
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    criteriaMode: 'all',
    defaultValues: {
      email: currentUser?.email || '',
      fullName: currentUser?.name || '',
      phoneNumber: currentUser?.phoneNumber || '',
      role: currentUser?.role || '',
      studentId: studentNames || studentName?.name || '',
    },
  });

  const values = watch();

  const handleClickSubmit = useCallback(
    async (data: FormData) => {
      try {
        if (!currentUser?.id) return;

        const formData: PayloadUpdateAuthInterface = {
          name: sanitizeToString(data.fullName),
          phoneNumber: sanitizeToString(data.phoneNumber),
          role: data.role as RoleUserType,
          email: sanitizeToString(data.email),
        };

        await onUpdate(currentUser.id, formData);

        router.reload();
        enqueueSnackbar('Profile berhasil diperbarui');
      } catch (error: any) {
        if (error.message === 'FirebaseError: Firebase: Error (auth/email-already-in-use).') {
          enqueueSnackbar('Email telah terdaftar', { variant: 'error' });
        } else {
          enqueueSnackbar(error.message, { variant: 'error' });
        }

        console.error(error);
      }
    },
    [enqueueSnackbar, onUpdate, currentUser, router]
  );

  const controllers: { name: 'fullName' | 'studentId' | 'email' | 'phoneNumber' | 'role'; rules: RegisterOptions<FormData>; options?: OptionSelectInterface[] | GroupedOptionSelectInterface[] }[] = [
    {
      name: 'fullName',
      rules: { required: 'Harap isi bidang nama anda.' },
    },
    {
      name: 'phoneNumber',
      rules: { required: 'Harap isi nomor telepon.' },
    },
    {
      name: 'email',
      rules: { required: 'Harap isi bidang email.' },
    },
    {
      name: 'role',
      rules: {},
    },
    {
      name: 'studentId',
      rules: {},
    },
  ];

  return (
    <form onSubmit={handleSubmit(handleClickSubmit)} className="h-fit w-full rounded-3xl border border-slate-100 bg-white p-6 shadow-md md:p-8">
      <div className="mb-8">
        <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Informasi Akun</p>

        <h2 className="mt-1 font-poppins text-2xl font-bold text-slate-800">Edit Profil</h2>

        <p className="mt-2 text-slate-500">Perbarui informasi akun Anda di bawah ini.</p>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
        {controllers.map((controller, index) => (
          <Controller
            key={index}
            control={control}
            name={controller.name}
            rules={controller.rules}
            render={({ field: { onChange, value } }) => (
              <div className="md:last:col-span-2">
                {controller.name === 'fullName' && <InputField label="Nama Anda" onChange={onChange} value={value as string} name={controller.name} placeholder="Masukan nama" />}

                {controller.name === 'email' && <InputField disabled label="Email" onChange={onChange} type="email" value={value as string} name={controller.name} placeholder="Masukan email" />}

                {controller.name === 'role' && <InputField disabled label="Peranan" onChange={onChange} value={value as string} name={controller.name} placeholder="Peranan" />}

                {controller.name === 'phoneNumber' && (
                  <InputField label="Nomor Telepon" onChange={onChange} type="number" value={value as string} name={controller.name} placeholder="Masukan nomor telepon" />
                )}

                {controller.name === 'studentId' && values.role === 'parent' && (
                  <InputField disabled label="Nama Siswa" onChange={onChange} value={value as string} name={controller.name} placeholder="Nama siswa" />
                )}

                <ErrorMessage errors={errors} name={controller.name} />
              </div>
            )}
          />
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting} className="mt-8 self-end rounded-xl bg-primary-1 px-8 py-3 font-semibold shadow-lg shadow-green-700/20 hover:bg-primary-3">
        {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
      </Button>
    </form>
  );
};

export default ProfileForm;
