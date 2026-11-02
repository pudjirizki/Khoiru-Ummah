import React, { useCallback, useEffect } from 'react';
import { Icon } from '@iconify/react';
import { useForm, Controller, RegisterOptions } from 'react-hook-form';
// context
import { UseFormContextProps } from '/src/context/form/form-provider';
// interfaces
import { TempGeneralFinalFormInterface } from '/src/interfaces/final-form';
// utils
import { sanitizeToString } from '/src/utils/format-sanitize';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { InputField, TextareaField, ErrorMessage } from '/src/components/form';
//
import { FormContextStateInterface } from '../view/form-create-view';

// ----------------------------------------------------------------------

interface FormData {
  desc: string;
  title: string;
  class: string[];
}

interface CreateGeneralFormProps {
  formContextState: FormContextStateInterface;
  onReset: UseFormContextProps['onReset'];
  onUpdateCurrentTab: UseFormContextProps['onUpdateCurrentTab'];
  onUpdateGeneralForm: UseFormContextProps['onUpdateGeneralForm'];
}
// ----------------------------------------------------------------------

const CreateGeneralForm: React.FC<CreateGeneralFormProps> = ({ formContextState, onUpdateCurrentTab, onUpdateGeneralForm, onReset }) => {
  const { enqueueSnackbar } = useSnackbar();

  const classList = [
    { label: 'Kelas 1', value: '1' },
    { label: 'Kelas 2', value: '2' },
    { label: 'Kelas 3', value: '3' },
    { label: 'Kelas 4', value: '4' },
    { label: 'Kelas 5', value: '5' },
    { label: 'Kelas 6', value: '6' },
  ];

  const {
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    criteriaMode: 'all',
    defaultValues: {
      desc: '',
      title: '',
      class: [],
    },
  });

  // FORM DEFAULT VALUES
  useEffect(() => {
    if (formContextState?.generalForm?.title) {
      setValue('title', formContextState?.generalForm?.title);
    }

    if (formContextState?.generalForm?.description) {
      setValue('desc', formContextState?.generalForm?.description);
    }

    if (formContextState?.generalForm?.class) {
      setValue('class', formContextState?.generalForm?.class);
    }
  }, [formContextState.generalForm, setValue]);

  const handleClickSubmit = useCallback(
    (data: FormData) => {
      const formData: TempGeneralFinalFormInterface = {
        description: sanitizeToString(data.desc),
        title: sanitizeToString(data.title),
        class: data.class,
      };

      onUpdateGeneralForm(formData);

      onUpdateCurrentTab('assessment');

      enqueueSnackbar('Perubahan berhasil disimpan');
    },
    [enqueueSnackbar, onUpdateGeneralForm, onUpdateCurrentTab]
  );

  const controllers: {
    name: 'desc' | 'title' | 'class';
    rules: RegisterOptions<FormData>;
  }[] = [
    {
      name: 'title',
      rules: { required: 'Harap isi bidang judul formulir.' },
    },
    {
      name: 'desc',
      rules: {},
    },
    {
      name: 'class',
      rules: { required: 'Harap isi bidang kelas.' },
    },
  ];

  return (
    <form onSubmit={handleSubmit(handleClickSubmit)}>
      <div className="flex w-full flex-col justify-center gap-4">
        {controllers.map((controller, index) => (
          <Controller
            key={index}
            control={control}
            name={controller.name}
            rules={controller.rules}
            render={({ field: { onChange, value } }) => (
              <div>
                {controller.name === 'title' && <InputField label="Judul" onChange={onChange} value={value as string} name={controller.name} placeholder="Masukan judul formulir" />}

                {controller.name === 'desc' && (
                  <TextareaField label="Deskripsi" onChange={onChange} value={value as string} name={controller.name} rows={4} placeholder="Masukan deskripsi (opsional)" />
                )}

                {controller.name === 'class' && (
                  <div className="form-control w-full gap-2">
                    <span className="text-sm text-[#404040]">Pilih Kelas</span>

                    <div className="grid w-full grid-cols-2 gap-y-4 md:grid-cols-3 lg:grid-cols-6">
                      {classList?.map((cl, i) => (
                        <InputField
                          key={i}
                          type="checkbox"
                          checkboxLabel={cl.label}
                          checked={value.includes(cl.value)}
                          name={controller.name}
                          value={value}
                          onChange={() => {
                            const v = value as string[];
                            const newValue = v.includes(cl.value) ? v.filter((item) => item !== cl.value) : [...value, cl.value];

                            onChange(newValue);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <ErrorMessage errors={errors} name={controller.name} />
              </div>
            )}
          />
        ))}
      </div>

      <div className="mt-10 flex flex-col-reverse items-center justify-end gap-3 md:flex-row">
        <Button
          onClick={() => {
            reset();
            onReset();
          }}
          disabled={isSubmitting}
          className="w-full bg-neutral-500 hover:bg-neutral-500/80 md:w-fit"
        >
          Reset
        </Button>

        <Button type="submit" disabled={isSubmitting} className="flex w-full flex-row items-center justify-center gap-2 md:w-fit">
          <span>Lanjut</span>
          <Icon icon="ic:round-arrow-forward-ios" color="#FFF" />
        </Button>
      </div>
    </form>
  );
};

export default CreateGeneralForm;
