import React, { useCallback } from 'react';
import { useForm, Controller, RegisterOptions } from 'react-hook-form';
// context
import { useUserContext } from '/src/context/user';
// routes
import { paths } from '/src/routes/paths';
import { useRouter } from '/src/routes/hooks';
// utils
import { sanitizeToString } from '/src/utils/format-sanitize';
// interfaces
import { RoleUserType } from '/src/interfaces/user';
import { PayloadRegisterAuthInterface } from '/src/interfaces/authentication';
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
  password: string;
}

// ----------------------------------------------------------------------

const roleOptions: OptionSelectInterface[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Guru', value: 'teacher' },
  { label: 'Wali Siswa', value: 'parent' },
];

// ----------------------------------------------------------------------

const CreateForm: React.FC = () => {
  const { enqueueSnackbar } = useSnackbar();

  const { onRegister } = useUserContext();

  const router = useRouter();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    criteriaMode: 'all',
    defaultValues: {
      name: '',
      phoneNumber: '',
      role: undefined,
      email: '',
      password: '',
    },
  });

  const handleClickSubmit = useCallback(
    async (data: FormData) => {
      try {
        const formData: PayloadRegisterAuthInterface = {
          name: sanitizeToString(data.name),
          nameLowercase: sanitizeToString(data.name.toLowerCase()),
          phoneNumber: sanitizeToString(data.phoneNumber),
          role: data.role?.value as RoleUserType,
          email: sanitizeToString(data.email),
          password: sanitizeToString(data.password),
          status: 'active',
        };

        await onRegister(formData);

        enqueueSnackbar('Pengguna berhasil ditambahkan');
        reset();
        router.push(paths.dashboard.user.root);
      } catch (error: any) {
        enqueueSnackbar(error.message, { variant: 'error' });
        console.error(error);
      }
    },
    [enqueueSnackbar, onRegister, reset, router]
  );

  const controllers: {
    name: 'name' | 'phoneNumber' | 'role' | 'email' | 'password';
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
      name: 'password',
      rules: {
        required: 'Harap isi bidang kata sandi.',
        validate: {
          notEmpty: (value) => {
            if (typeof value === 'string') {
              return value.trim() !== '' || 'Kata sandi tidak valid.';
            }
            return 'Kata sandi tidak valid.';
          },
          minLength: (value) => {
            if (typeof value === 'string') {
              return value.length >= 6 || 'Kata sandi harus minimal 6 karakter.';
            }
            return 'Kata sandi harus minimal 6 karakter.';
          },
        },
      },
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
            render={({ field: { onChange } }) => (
              <div>
                {controller.name === 'name' && <InputField label="Nama Lengkap" onChange={onChange} name={controller.name} placeholder="Masukan nama lengkap" />}

                {controller.name === 'email' && <InputField type="email" label="Email" onChange={onChange} name={controller.name} placeholder="Masukan email" />}

                {controller.name === 'phoneNumber' && (
                  <InputField
                    onInput={(e) => {
                      e.currentTarget.value = e.currentTarget.value.replace(/\D/g, '');
                    }}
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

                {controller.name === 'password' && <InputField type="password" label="Kata Sandi" onChange={onChange} name={controller.name} placeholder="Masukan kata sandi" />}

                <ErrorMessage errors={errors} name={controller.name} />
              </div>
            )}
          />
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting} fullWidth className="px-10 py-3">
        Tambah Pengguna
      </Button>
    </form>
  );
};

export default CreateForm;
