import React, { useCallback, useState } from 'react';
import { Icon } from '@iconify/react';
import { Controller, RegisterOptions, useForm } from 'react-hook-form';
// context
import { useUserContext } from '/src/context/user';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { InputField, ErrorMessage } from '/src/components/form';

// ----------------------------------------------------------------------

interface FormData {
  email: string;
  password: string;
}

// ----------------------------------------------------------------------

const LoginForm: React.FC = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const { onLoginEmail } = useUserContext();
  const { enqueueSnackbar } = useSnackbar();

  const {
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    criteriaMode: 'all',
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleClickViewHidePassword = useCallback(() => {
    setIsPasswordVisible((prev) => !prev);
  }, []);

  const handleClickSubmit = useCallback(
    async (data: FormData) => {
      try {
        const formData = {
          email: data.email.trim(),
          password: data.password.trim(),
        };

        await onLoginEmail(formData);
        reset();
      } catch (error: any) {
        const errorCode = error?.code as string | undefined;
        const errorMessage = (error?.message as string | undefined) ?? '';

        if (errorCode === 'auth/invalid-credential' || errorCode === 'auth/wrong-password' || errorCode === 'auth/user-not-found' || errorMessage.includes('auth/invalid-credential')) {
          enqueueSnackbar('Email atau password salah', { variant: 'error' });
        } else {
          enqueueSnackbar(error?.message || 'Terjadi kesalahan saat login.', { variant: 'error' });
        }

        console.error(error);
      }
    },
    [onLoginEmail, enqueueSnackbar, reset]
  );

  const controllers: { name: 'email' | 'password'; rules: RegisterOptions<FormData> }[] = [
    {
      name: 'email',
      rules: { required: 'Harap isi bidang email.' },
    },
    {
      name: 'password',
      rules: {
        required: 'Harap isi bidang kata sandi.',
        validate: {
          notEmpty: (value) => value.trim() !== '' || 'Kata sandi tidak valid.',
          minLength: (value) => value.length >= 6 || 'Kata sandi harus minimal 6 karakter.',
        },
      },
    },
  ];

  return (
    <form onSubmit={handleSubmit(handleClickSubmit)} className="flex w-full flex-col gap-5">
      {controllers.map((controller) => (
        <Controller
          key={controller.name}
          control={control}
          name={controller.name}
          rules={controller.rules}
          render={({ field: { onChange, value } }) => (
            <div className="space-y-2">
              {controller.name === 'email' && (
                <InputField
                  label="Email"
                  onChange={onChange}
                  type="email"
                  value={value as string}
                  name={controller.name}
                  placeholder="Masukkan email"
                  inputClassname="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 text-slate-900 placeholder:text-slate-400 focus:border-primary-2 focus:ring-2 focus:ring-primary-2/20"
                  labelClassname="text-sm font-medium text-slate-700"
                />
              )}

              {controller.name === 'password' && (
                <div className="relative">
                  <InputField
                    label="Kata Sandi"
                    onChange={onChange}
                    type={isPasswordVisible ? 'text' : 'password'}
                    value={value as string}
                    name={controller.name}
                    placeholder="Masukkan kata sandi"
                    inputClassname="h-12 rounded-2xl border-slate-200 bg-slate-50 px-4 pr-12 text-slate-900 placeholder:text-slate-400 focus:border-primary-2 focus:ring-2 focus:ring-primary-2/20"
                    labelClassname="text-sm font-medium text-slate-700"
                  />

                  <Button
                    type="button"
                    onClick={handleClickViewHidePassword}
                    variant="gost"
                    className="absolute right-3 top-[69%] -translate-y-1/2 rounded-xl bg-transparent p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Icon icon={!isPasswordVisible ? 'heroicons:eye-20-solid' : 'heroicons:eye-slash-20-solid'} width={20} />
                  </Button>
                </div>
              )}

              <ErrorMessage errors={errors} name={controller.name} />
            </div>
          )}
        />
      ))}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          fullWidth
          className="h-12 rounded-2xl bg-primary-3 font-semibold text-white shadow-lg shadow-primary-3/20 transition hover:bg-primary-1 hover:shadow-primary-3/30 active:scale-[0.99]"
        >
          {isSubmitting ? 'Memproses...' : 'Masuk'}
        </Button>
      </div>
    </form>
  );
};

export default LoginForm;
