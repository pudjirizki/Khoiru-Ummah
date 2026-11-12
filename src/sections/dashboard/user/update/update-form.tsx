import React, { useCallback, useEffect } from 'react';
import { useForm, Controller, RegisterOptions } from 'react-hook-form';
// context
import { UseUserContextProps } from '/src/context/user/user-provider';
// routes
import { paths } from '/src/routes/paths';
import { useRouter } from '/src/routes/hooks';
// utils
import { sanitizeToString } from '/src/utils/format-sanitize';
// interfaces
import { RoleUserType, StatusUserType, UserInterface } from '/src/interfaces/user';
import { PayloadUpdateAuthInterface } from '/src/interfaces/authentication';
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
  name: string;
  phoneNumber: string;
  role: OptionSelectInterface | undefined;
  email: string;
  status: OptionSelectInterface | undefined;
}

interface UpdateFormProps {
  currentUser: UserInterface;
  onUpdateUser: UseUserContextProps['onUpdate'];
}

// ----------------------------------------------------------------------

const roleOptions: OptionSelectInterface[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Guru', value: 'teacher' },
  { label: 'Wali Siswa', value: 'parent' },
];

const statusOptions: OptionSelectInterface[] = [
  { label: 'Aktif', value: 'active' },
  { label: 'Nonaktif', value: 'inactive' },
];

// ----------------------------------------------------------------------

const UpdateForm: React.FC<UpdateFormProps> = ({ currentUser, onUpdateUser }) => {
  const { enqueueSnackbar } = useSnackbar();

  const router = useRouter();

  const {
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    criteriaMode: 'all',
    defaultValues: {
      name: currentUser?.name ?? '',
      phoneNumber: currentUser?.phoneNumber ?? '',
      role: undefined,
      email: currentUser?.email ?? '',
      status: undefined,
    },
  });

  // DEFAULT VALUES
  useEffect(() => {
    if (!currentUser?.role) return;

    const filteredRoleOptions = roleOptions.find((r) => r.value === currentUser.role);
    setValue('role', filteredRoleOptions);

    if (!currentUser?.status) return;

    const filteredStatusOptions = statusOptions.find((s) => s.value === currentUser.status);
    setValue('status', filteredStatusOptions);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role, currentUser?.status]);

  const handleClickSubmit = useCallback(
    async (data: FormData) => {
      try {
        if (!currentUser?.id) return;

        const formData: PayloadUpdateAuthInterface = {
          name: sanitizeToString(data.name),
          nameLowercase: sanitizeToString(data.name.toLowerCase()),
          phoneNumber: sanitizeToString(data.phoneNumber),
          role: data.role?.value as RoleUserType,
          email: sanitizeToString(data.email),
          status: data.status?.value as StatusUserType,
        };

        await onUpdateUser(currentUser.id, formData);

        enqueueSnackbar('Pengguna berhasil diubah');
        reset();
        router.push(paths.dashboard.user.root);
      } catch (error: any) {
        enqueueSnackbar(error.message, { variant: 'error' });
        console.error(error);
      }
    },
    [currentUser.id, enqueueSnackbar, onUpdateUser, reset, router]
  );

  const controllers: {
    name: 'name' | 'phoneNumber' | 'role' | 'email' | 'status';
    rules: RegisterOptions<FormData>;
    options?: OptionSelectInterface[];
  }[] = [
    {
      name: 'name',
      rules: { required: 'Harap isi bidang nama lengkap.' },
    },
    {
      name: 'email',
      rules: { required: 'Harap isi bidang email.' },
    },
    {
      name: 'phoneNumber',
      rules: {},
    },
    {
      name: 'role',
      rules: { required: 'Harap isi bidang peranan.' },
      options: roleOptions,
    },
    {
      name: 'status',
      rules: { required: 'Harap isi bidang status.' },
      options: statusOptions,
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
                {controller.name === 'name' && <InputField label="Nama Lengkap" onChange={onChange} value={value as string} name={controller.name} placeholder="Masukan nama lengkap" />}

                {controller.name === 'email' && <InputField disabled type="email" label="Email" onChange={onChange} value={value as string} name={controller.name} placeholder="Masukan email" />}

                {controller.name === 'phoneNumber' && (
                  <InputField
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
                    }}
                    value={value as string}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    label="Nomor Telepon"
                    onChange={onChange}
                    name={controller.name}
                    placeholder="Masukan nomor telepon"
                  />
                )}

                {controller.name === 'role' && (
                  <SelectField
                    value={value as OptionSelectInterface}
                    placeholder="Pilih peranan"
                    options={controller.options}
                    onChange={onChange}
                    label="Peranan"
                    name={controller.name}
                    components={{
                      IndicatorSeparator: () => null,
                    }}
                  />
                )}

                {controller.name === 'status' && (
                  <SelectField
                    value={value as OptionSelectInterface}
                    placeholder="Pilih status"
                    options={controller.options}
                    onChange={onChange}
                    label="Status"
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
