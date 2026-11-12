import React, { KeyboardEvent, useCallback, useEffect, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { twMerge } from 'tailwind-merge';
import { useForm, useFieldArray, Controller, useWatch, type Control, type FieldArrayWithId, type UseFormGetValues, type UseFormRegister, type UseFormSetValue } from 'react-hook-form';
// routes
import { paths } from '/src/routes/paths';
import { useRouter } from '/src/routes/hooks';
// context
import { UseFormContextProps } from '/src/context/form/form-provider';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { UseFinalFormInterface } from '/src/hooks/use-final-form';
import { UseDatabaseCriteriaInterface } from '/src/hooks/use-database-criteria';
import { UseDatabaseQuestionInterface } from '/src/hooks/use-database-question';
// interfaces
import { CurrentUserInterface } from '/src/interfaces/user';
import { FinalFormInterface, PayloadUpdateFinalFormInterface, PayloadUpdateCriteriasFinalFormInterface } from '/src/interfaces/final-form';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { DialogConfirm, DialogGeneral } from '/src/components/dialog';
import { InputField, TextareaField } from '/src/components/form';
//
import { FormContextStateInterface } from '../view/form-update-view';

// ----------------------------------------------------------------------

interface FormData {
  notes: string;
  criterias: PayloadUpdateCriteriasFinalFormInterface[];
}

interface UpdateAssessmentFormProps {
  currentForm: FinalFormInterface;
  formContextState: FormContextStateInterface;
  currentUser: CurrentUserInterface | null;
  onReset: UseFormContextProps['onReset'];
  onUpdateCurrentTab: UseFormContextProps['onUpdateCurrentTab'];
  onUpdateForm: UseFinalFormInterface['updateFinalForm'];
  onDeleteCriteria: UseDatabaseCriteriaInterface['deleteCriteria'];
  onDeleteQuestion: UseDatabaseQuestionInterface['deleteQuestion'];
}

interface GroupFieldsProps {
  control: Control<FormData>;
  enqueueSnackbar: ReturnType<typeof useSnackbar>['enqueueSnackbar'];
  field: FieldArrayWithId<FormData, 'criterias', 'id'>;
  getValues: UseFormGetValues<FormData>;
  handleDeleteGroup: (index: number) => Promise<void>;
  index: number;
  isSubmitting: boolean;
  onDeleteQuestion: UseDatabaseQuestionInterface['deleteQuestion'];
  register: UseFormRegister<FormData>;
  setValue: UseFormSetValue<FormData>;
  totalBobot: number;
}

// ----------------------------------------------------------------------

const alphabet = Array.from(Array(26)).map((_, i) => String.fromCharCode(i + 97));

// ----------------------------------------------------------------------

const UpdateAssessmentForm: React.FC<UpdateAssessmentFormProps> = ({ currentForm, formContextState, currentUser, onUpdateCurrentTab, onReset, onUpdateForm, onDeleteCriteria, onDeleteQuestion }) => {
  const router = useRouter();

  const { enqueueSnackbar } = useSnackbar();

  const {
    register,
    control,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      notes: formContextState?.assessmentForm?.notes || '',
      criterias: formContextState?.assessmentForm?.criterias || [{ title: alphabet[0], description: '', weight: 0, questions: [{ order: 1, text: '' }] }],
    },
  });

  const criteriasValue = useWatch({
    control,
    name: 'criterias',
  });

  const totalBobot = useMemo(() => (criteriasValue ?? []).reduce((acc, cur) => acc + (cur.weight ?? 0), 0), [criteriasValue]);

  const {
    fields: criteriaFields,
    append: appendCriteria,
    remove: removeCriteria,
  } = useFieldArray({
    control,
    name: 'criterias',
  });

  useEffect(() => {
    const current = getValues('criterias') || [];

    if (!Array.isArray(current) || current.length === 0) return;

    const updated = current.map((c: any, i: number) => ({
      ...c,
      title: alphabet[i] || `g${i}`,
      questions: (c.questions || []).map((q: any, qi: number) => ({ ...q, order: qi + 1 })),
    }));

    const isSame = updated.every((u, i) => u.title === (current[i]?.title ?? ''));

    if (!isSame) {
      setValue('criterias', updated);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criteriaFields.map((f) => f.id).join(',')]);

  const handleAddGroup = useCallback(() => {
    const nextGroupName = alphabet[criteriaFields.length] || `g${criteriaFields.length}`;
    appendCriteria({ title: nextGroupName, description: '', weight: 0, questions: [{ order: 1, text: '' }] });
    enqueueSnackbar(`Berhasil menambahkan kriteria ${nextGroupName.toUpperCase()}`);
  }, [criteriaFields.length, appendCriteria, enqueueSnackbar]);

  const handleDeleteGroup = useCallback(
    async (index: number) => {
      try {
        const criterias = getValues('criterias') || [];
        const current = criterias[index];

        if (!current?.id) {
          removeCriteria(index);
          enqueueSnackbar('Kriteria dihapus');
          return;
        }

        const questionIds = current.questions?.map((q) => q?.id).filter(Boolean) ?? [];

        await Promise.all(questionIds.map((id) => onDeleteQuestion(id!)));
        await onDeleteCriteria(current.id);

        removeCriteria(index);
        enqueueSnackbar('Kriteria dihapus');
      } catch (error: any) {
        console.error(error);
        enqueueSnackbar(error.message, { variant: 'error' });
      }
    },
    [enqueueSnackbar, getValues, onDeleteCriteria, onDeleteQuestion, removeCriteria]
  );

  const onSubmit = useCallback(
    async (data: FormData) => {
      try {
        const dbUser = currentUser?.databaseUsers;
        if (!dbUser?.id) return;

        if (!['admin', 'teacher'].includes(dbUser.role)) {
          enqueueSnackbar('Anda tidak memiliki akses', { variant: 'error' });
          return;
        }

        if (Math.round(totalBobot) !== 100) {
          enqueueSnackbar('Akumulasi pembobotan harus 100%', { variant: 'error' });
          return;
        }

        const final = data.criterias
          .filter((g) => g.questions?.length && g.description?.trim() && (g.weight ?? 0) > 0)
          .map((g) => ({
            ...g,
            questions: g.questions?.map((q, idx) => ({
              ...q,
              order: idx + 1,
            })),
          }));

        const formData: PayloadUpdateFinalFormInterface = {
          createdBy: dbUser.id,
          title: formContextState?.generalForm?.title || '',
          description: formContextState?.generalForm?.description || '',
          class: formContextState?.generalForm?.class || [''],
          notes: data.notes,
          criterias: final,
        };

        await onUpdateForm(currentForm.id, formData, currentForm);

        onReset();
        enqueueSnackbar('Formulir berhasil diubah');
        router.push(paths.dashboard.form.root);
      } catch (error: any) {
        enqueueSnackbar(error.message, { variant: 'error' });
        console.error(error);
      }
    },
    [
      currentForm,
      currentUser?.databaseUsers,
      enqueueSnackbar,
      formContextState?.generalForm?.class,
      formContextState?.generalForm?.description,
      formContextState?.generalForm?.title,
      onReset,
      onUpdateForm,
      router,
      totalBobot,
    ]
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <TextareaField label="Catatan" rows={4} placeholder="Masukan catatan (opsional)" {...register('notes')} />

      <div className="flex flex-col gap-4">
        {criteriaFields.map((g, i) => (
          <GroupFields
            key={g.id}
            control={control}
            enqueueSnackbar={enqueueSnackbar}
            field={g}
            getValues={getValues}
            handleDeleteGroup={handleDeleteGroup}
            index={i}
            isSubmitting={isSubmitting}
            onDeleteQuestion={onDeleteQuestion}
            register={register}
            setValue={setValue}
            totalBobot={totalBobot}
          />
        ))}
      </div>

      <Button onClick={handleAddGroup} disabled={isSubmitting || totalBobot >= 100} className="flex w-full items-center justify-center gap-2">
        <Icon icon="mingcute:add-fill" color="#FFF" />
        <span>Tambah Kriteria</span>
      </Button>

      <div className="mt-6 flex flex-col items-center justify-between gap-3 md:flex-row">
        <Button onClick={() => onUpdateCurrentTab('general')} disabled={isSubmitting} className="flex w-full flex-row items-center justify-center gap-2 md:w-fit">
          <Icon icon="ic:round-arrow-back-ios" color="#FFF" />
          <span>Kembali</span>
        </Button>

        <div className="flex w-full flex-col-reverse items-center justify-end gap-3 md:flex-row">
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
            <span>Simpan Perubahan</span>
            <Icon icon="ic:round-arrow-forward-ios" color="#FFF" />
          </Button>
        </div>
      </div>
    </form>
  );
};

const GroupFields: React.FC<GroupFieldsProps> = ({ control, enqueueSnackbar, field, getValues, handleDeleteGroup, index, isSubmitting, onDeleteQuestion, register, setValue, totalBobot }) => {
  const name = `criterias.${index}.questions` as const;
  const {
    fields: questionFields,
    append: appendQuestion,
    remove: removeQuestion,
  } = useFieldArray({
    control,
    name,
  });

  const handleAddQuestion = useCallback(() => {
    const nextOrder = questionFields.length + 1;
    appendQuestion({ order: nextOrder, text: '' });
    enqueueSnackbar('Berhasil menambahkan pertanyaan');
  }, [appendQuestion, enqueueSnackbar, questionFields.length]);

  const handleDeleteQuestion = useCallback(
    async (questionIndex: number, criteriaIndex: number) => {
      try {
        const criterias = getValues('criterias') || [];
        const current = criterias[criteriaIndex]?.questions?.[questionIndex];

        if (!current?.id) {
          removeQuestion(questionIndex);

          const questions = getValues(`criterias.${criteriaIndex}.questions`) ?? [];
          const updated = questions.map((q, i) => ({ ...q, order: i + 1 }));
          setValue(`criterias.${criteriaIndex}.questions`, updated);
          enqueueSnackbar('Pertanyaan dihapus');
          return;
        }

        await onDeleteQuestion(current.id);

        removeQuestion(questionIndex);

        const questions = getValues(`criterias.${criteriaIndex}.questions`) ?? [];
        const updated = questions.map((q, i) => ({ ...q, order: i + 1 }));
        setValue(`criterias.${criteriaIndex}.questions`, updated);

        enqueueSnackbar('Pertanyaan dihapus');
      } catch (error: any) {
        console.error(error);
        enqueueSnackbar(error.message, { variant: 'error' });
      }
    },
    [enqueueSnackbar, getValues, onDeleteQuestion, removeQuestion, setValue]
  );

  const criteriaTitle = field.title ?? alphabet[index] ?? `g${index}`;
  const criteriaLabel = criteriaTitle.toUpperCase();

  return (
    <div className="flex flex-col gap-2 rounded border p-3" aria-label={`criteria-${criteriaTitle}`}>
      <div className="flex items-center gap-2">
        <div className="flex w-full flex-col items-center gap-2 md:flex-row">
          <div className="flex w-full flex-col gap-2">
            <p>Kriteria</p>

            <div className="flex w-full items-center gap-2">
              <p className="text-lg font-semibold">{criteriaLabel}. </p>

              <InputField
                {...register(`criterias.${index}.description` as const)}
                placeholder={`Judul Kriteria ${criteriaLabel}`}
                onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') e.preventDefault();
                }}
              />
            </div>
          </div>

          <Controller
            control={control}
            name={`criterias.${index}.weight`}
            defaultValue={0}
            render={({ field }) => {
              const displayValue = field.value === 0 || field.value === undefined ? '' : String(field.value);

              return (
                <div className="relative flex w-full flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <p>Bobot</p>

                    <RenderDialog />
                  </div>

                  <div className="relative w-full">
                    <InputField
                      {...field}
                      type="number"
                      value={displayValue}
                      placeholder="Persentase Bobot"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? 0 : Number(v));
                      }}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') e.preventDefault();
                      }}
                      containerClassname="pl-7 md:pl-0"
                      inputClassname="pr-9"
                    />

                    <Icon icon="material-symbols:percent-rounded" className="absolute right-3 top-[50%] size-5 translate-y-[-50%]" />
                  </div>

                  <span className={twMerge('absolute bottom-[-20px] left-[5px] text-xs text-yellow-500', totalBobot > 100 && 'text-red-500', totalBobot === 100 && 'text-green-500')}>
                    Total bobot saat ini {totalBobot}%
                  </span>
                </div>
              );
            }}
          />
        </div>

        <DialogConfirm
          label={
            <span aria-label={`Hapus kriteria ${field.description}`} data-tip="Hapus" className="tooltip ml-2">
              <Icon icon="mdi:trash" width={18} className="tooltip text-red-500" />
            </span>
          }
          title={`Konfirmasi penghapusan ${field.id}`}
          action={() => handleDeleteGroup(index)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <div className="flex items-center gap-1.5">
          <p>Daftar Pertanyaan:</p>

          <RenderDialog2 />
        </div>

        {questionFields.map((qf, qi) => (
          <div key={qf.id} className="flex items-center gap-2">
            <p className="w-6">{qi + 1}.</p>

            <InputField
              {...register(`criterias.${index}.questions.${qi}.text` as const)}
              placeholder={`Pertanyaan ${qi + 1}`}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                if (e.key === 'Enter') e.preventDefault();
              }}
            />

            <DialogConfirm
              label={
                <span aria-label={`Hapus pertanyaan ${qi + 1}`} data-tip="Hapus" className="tooltip ml-2">
                  <Icon icon="mdi:trash" width={18} className="tooltip text-red-500" />
                </span>
              }
              title="Konfirmasi penghapusan pertanyaan"
              action={() => handleDeleteQuestion(qi, index)}
            />
          </div>
        ))}

        <div className="mt-2 self-center">
          <Button onClick={handleAddQuestion} disabled={isSubmitting} className="flex items-center gap-2">
            <Icon icon="mingcute:add-fill" color="#FFF" />
            <span>Tambah Pertanyaan</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

function RenderDialog() {
  const isShowDialog = useBoolean(false);

  return (
    <>
      <Button onClick={isShowDialog.onTrue} variant="gost">
        <Icon icon="material-symbols:info" className="size-5 text-neutral-500" />
      </Button>

      <DialogGeneral state={isShowDialog} centered className="flex flex-col gap-1">
        <p className="text-xl font-semibold">Bobot Penilaian</p>
        <p>Akumulasi bobot secara keseluruhan wajib berjumlah 100%</p>
      </DialogGeneral>
    </>
  );
}

function RenderDialog2() {
  const isShowDialog = useBoolean(false);

  return (
    <>
      <Button onClick={isShowDialog.onTrue} variant="gost">
        <Icon icon="material-symbols:info" className="size-5 text-neutral-500" />
      </Button>

      <DialogGeneral state={isShowDialog} centered className="flex flex-col gap-1">
        <p className="text-xl font-semibold">Daftar Pertanyaan</p>
        <p>Pertanyaan ini akan memengaruhi bobot penilaian dalam kriteria terkait. Masing-masing pertanyaan akan diberikan bobot nilai yang sama.</p>
      </DialogGeneral>
    </>
  );
}

export default UpdateAssessmentForm;
