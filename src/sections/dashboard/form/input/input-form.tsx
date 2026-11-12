import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GroupBase } from 'react-select';
import { Controller, FieldErrors, useForm } from 'react-hook-form';
// routes
import { paths } from '/src/routes/paths';
import { useRouter } from '/src/routes/hooks';
// services
import { sendNotificationEmail } from '/src/services/email';
// lib
import { calculateAssessmentScore, calculateAveragePoint } from '/src/lib/calculations/scoring';
// hooks
import { UseDatabaseUserInterface } from '/src/hooks/use-database-user';
import { useDatabaseAnswer } from '/src/hooks/use-database-answer';
import { UseDatabaseStudentInterface } from '/src/hooks/use-database-student';
import { UseFinalAssessmentInterface } from '/src/hooks/use-final-assessment';
import { UseDatabaseAssessmentInterface } from '/src/hooks/use-database-assessment';
import { useDatabaseAnswerDetail } from '/src/hooks/use-database-answer-detail';
// interfaces
import { CurrentUserInterface } from '/src/interfaces/user';
import { CriteriasFinalFormInterface, FinalFormInterface } from '/src/interfaces/final-form';
import { PayloadCreateAnswerDetailsAnswersFinalAssessmentInterface, PayloadCreateAnswersFinalAssessmentInterface, PayloadCreateFinalAssessmentInterface } from '/src/interfaces/final-assessment';
// constants
import { ASSESSMENT_POINT_LIST } from '/src/constants/assessment';
// utils
import { fTitleCase } from '/src/utils/format-string';
// components
import { Button } from '/src/components/button';
import { useSnackbar } from '/src/components/snackbar';
import { InputField, ErrorMessage, SelectField, TextareaField } from '/src/components/form';

// ----------------------------------------------------------------------

interface OptionSelectInterface {
  label: string;
  value: string;
  isDisabled?: boolean;
  isSubmitted?: boolean;
}

interface GroupedOptionSelectInterface {
  label: string;
  options: OptionSelectInterface[];
}

interface SelectedQuestionInterface {
  criteriaId: string;
  criteriaWeight: number;
  answerDetail: PayloadCreateAnswerDetailsAnswersFinalAssessmentInterface;
}

interface FormData {
  name: string;
  phoneNumber: string;
  email: string;
  catatan: string;
  student: OptionSelectInterface | undefined;
}

interface InputFormProps {
  students: UseDatabaseStudentInterface['allStudentsCache'];
  assessments: UseDatabaseAssessmentInterface['allAssessmentsCache'];
  users: UseDatabaseUserInterface['allUsersCache'];
  currentForm: FinalFormInterface | null;
  currentUser: CurrentUserInterface;
  onCreateAssessment: UseFinalAssessmentInterface['createFinalAssessment'];
}

// ----------------------------------------------------------------------

const InputForm: React.FC<InputFormProps> = ({ students, assessments, users, currentForm, currentUser, onCreateAssessment }) => {
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestionInterface[]>([]);

  const [finalAnswers, setFinalAnswers] = useState<PayloadCreateAnswersFinalAssessmentInterface[]>([]);

  const [totalQuestions, setTotalQuestions] = useState<number>(0);

  const [finalAssessmentScore, setFinalAssessmentScore] = useState<number>(0);

  const fieldRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { enqueueSnackbar } = useSnackbar();

  const router = useRouter();

  const { allAnswersCache } = useDatabaseAnswer();

  const { allAnswerDetailsCache } = useDatabaseAnswerDetail();

  // GET STUDENT OPTIONS, FILTER STUDENT OPTIONS BY CLASS, DISABLE TEACHER ASSESSED
  const studentOptions = useMemo(() => {
    if (!students?.length || !currentForm) return [] as GroupedOptionSelectInterface[];

    const currentUserId = currentUser.databaseUsers?.id;
    const baseStudents = currentUser.databaseUsers?.role === 'parent' ? students.filter((st) => st.parentId === currentUserId) : students;

    const matched = baseStudents.filter((st) => currentForm.class.includes(st.class));

    matched.sort((a, b) => a.class.localeCompare(b.class, undefined, { sensitivity: 'base' }) || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    const submittedCountByStudent = new Map<string, number>();
    for (const a of assessments) {
      if (a.formId !== currentForm.id) continue;
      if (a.userId !== currentUserId) continue;
      submittedCountByStudent.set(a.studenId, (submittedCountByStudent.get(a.studenId) ?? 0) + 1);
    }

    const groups = new Map<string, GroupedOptionSelectInterface>();
    for (const student of matched) {
      const classKey = `Kelas ${student.class}`;
      if (!groups.has(classKey)) {
        groups.set(classKey, { label: classKey, options: [] });
      }

      const submittedCount = submittedCountByStudent.get(student.id) ?? 0;
      const optionLabel = `${fTitleCase(student.name)}${submittedCount > 0 ? ' (Formulir sudah terisi)' : ''}`;

      groups.get(classKey)!.options.push({
        label: optionLabel,
        value: student.id,
        isSubmitted: submittedCount > 0,
      });
    }

    const result = Array.from(groups.values()).map((g) => ({
      ...g,
      options: g.options.sort((x, y) => x.label.localeCompare(y.label, undefined, { sensitivity: 'base' })),
    }));

    return result;
  }, [assessments, currentForm, currentUser.databaseUsers?.id, currentUser.databaseUsers?.role, students]);

  const adminTeacherEmails = useMemo(() => {
    const selectedRoles = users.filter((u) => u.role !== 'parent');

    return selectedRoles.map((parent) => parent.email);
  }, [users]);

  // GET FINAL ANSWERS
  useEffect(() => {
    const getFinalAnswers = () => {
      const questionGrouping = selectedQuestions?.reduce<PayloadCreateAnswersFinalAssessmentInterface[]>((acc, curr) => {
        const groupIndex = acc.findIndex((item) => item.criteriaId === curr.criteriaId);

        if (groupIndex > -1) {
          acc[groupIndex].answerDetails.push(curr.answerDetail);
        } else {
          acc.push({
            criteriaId: curr.criteriaId,
            averagePoint: 0,
            answerDetails: [curr.answerDetail],
          });
        }

        return acc;
      }, []);

      const result = questionGrouping?.reduce<PayloadCreateAnswersFinalAssessmentInterface[]>((acc, curr) => {
        const points = curr.answerDetails.map((d) => d.point);
        const averagePoint = calculateAveragePoint(points);

        acc.push({
          criteriaId: curr.criteriaId,
          answerDetails: curr.answerDetails,
          averagePoint,
        });

        return acc;
      }, []);

      setFinalAnswers(result);
    };

    getFinalAnswers();
  }, [selectedQuestions]);

  // GET FINAL ASSESSMENT SCORE
  useEffect(() => {
    if (!finalAnswers?.length || !currentForm?.criterias?.length) {
      setFinalAssessmentScore(0);
      return;
    }

    const group = finalAnswers.map((a) => {
      const points = a.answerDetails?.map((d) => d.point ?? 0) ?? [];
      const criteria = currentForm.criterias.find((c) => c.id === a.criteriaId);

      const rawWeight = criteria?.weight ?? 0;
      const weight = rawWeight > 1 ? rawWeight / 100 : rawWeight;

      return { points, weight };
    });

    const totalWeight = group.reduce((s, g) => s + g.weight, 0);
    const normalizedGroup = totalWeight > 0 && Math.abs(totalWeight - 1) > 1e-6 ? group.map((g) => ({ ...g, weight: g.weight / totalWeight })) : group;

    const result = calculateAssessmentScore(normalizedGroup);

    setFinalAssessmentScore(Number(result.toFixed(2)));
  }, [currentForm?.criterias, finalAnswers]);

  // GET TOTAL QUESTION
  useEffect(() => {
    const result = currentForm?.criterias?.reduce<number>((acc, curr) => {
      acc += curr.questions.length;
      return acc;
    }, 0);

    setTotalQuestions(result!);
  }, [currentForm?.criterias]);

  const {
    handleSubmit,
    register,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    criteriaMode: 'all',
    defaultValues: {
      student: undefined,
      name: currentUser?.databaseUsers?.name || '',
      phoneNumber: currentUser?.databaseUsers?.phoneNumber || '',
      email: currentUser?.databaseUsers?.email || '',
      catatan: '',
    },
  });

  const selectedStudentOption = watch('student');

  const parentStudents = useMemo(() => {
    const parentId = currentUser.databaseUsers?.id;

    if (currentUser.databaseUsers?.role !== 'parent' || !parentId) return [];

    return students.filter((student) => student.parentId === parentId);
  }, [currentUser.databaseUsers?.id, currentUser.databaseUsers?.role, students]);

  const selectedSubmittedAssessment = useMemo(() => {
    const selectedStudentId = selectedStudentOption?.value;
    const currentUserId = currentUser.databaseUsers?.id;

    if (!selectedStudentId || !currentForm?.id || !currentUserId) return undefined;

    return assessments
      .filter((assessment) => assessment.formId === currentForm.id && assessment.userId === currentUserId && assessment.studenId === selectedStudentId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [assessments, currentForm?.id, currentUser.databaseUsers?.id, selectedStudentOption?.value]);

  const isSelectedStudentSubmitted = !!selectedSubmittedAssessment;

  useEffect(() => {
    if (!selectedStudentOption?.value || !selectedSubmittedAssessment?.id) {
      setSelectedQuestions([]);
      return;
    }

    const assessmentAnswers = allAnswersCache.filter((answer) => answer.assessmentId === selectedSubmittedAssessment.id);
    const criteriaWeightMap = new Map((currentForm?.criterias ?? []).map((criteria) => [criteria.id, criteria.weight]));

    const submittedQuestions = assessmentAnswers.flatMap((answer) =>
      allAnswerDetailsCache
        .filter((detail) => detail.answerId === answer.id)
        .map((detail) => ({
          criteriaId: answer.criteriaId,
          criteriaWeight: criteriaWeightMap.get(answer.criteriaId) ?? 0,
          answerDetail: {
            questionId: detail.questionId,
            point: detail.point,
          },
        }))
    );

    setSelectedQuestions(submittedQuestions);
  }, [allAnswerDetailsCache, allAnswersCache, currentForm?.criterias, selectedStudentOption?.value, selectedSubmittedAssessment?.id]);

  // DEFAULT VALUE STUDENT
  useEffect(() => {
    const availableOptions = studentOptions.flatMap((group) => group.options);
    const shouldChooseParentStudent = currentUser.databaseUsers?.role === 'parent' && availableOptions.length !== 1;
    const defaultStudent = shouldChooseParentStudent ? undefined : availableOptions[0];

    setValue('student', defaultStudent);
  }, [currentForm?.id, currentUser.databaseUsers?.role, setValue, studentOptions]);

  const handleChangeAssessmentPoint = useCallback(
    (criteria: CriteriasFinalFormInterface, questionId: string, point: number) => {
      if (isSelectedStudentSubmitted) return;

      const result: SelectedQuestionInterface = {
        criteriaId: criteria.id,
        criteriaWeight: criteria.weight,
        answerDetail: {
          point,
          questionId,
        },
      };

      const newValue = [...selectedQuestions, result];

      const temp: { [key: string]: SelectedQuestionInterface } = {};

      newValue?.forEach((item) => {
        const key = `${item.criteriaId}-${item.answerDetail.questionId}`;
        temp[key] = item;
      });

      const finalResult: SelectedQuestionInterface[] = Object.values(temp);
      setSelectedQuestions(finalResult);
    },
    [isSelectedStudentSubmitted, selectedQuestions]
  );

  const scrollToField = useCallback((fieldName: string) => {
    fieldRefs.current[fieldName]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, []);

  const getQuestionFieldName = useCallback((criteriaId: string, questionId: string) => `question-${criteriaId}-${questionId}`, []);

  const handleInvalidSubmit = useCallback(
    (formErrors: FieldErrors<FormData>) => {
      const fieldOrder: Array<keyof FormData> = ['student', 'name', 'phoneNumber', 'email'];
      const firstErrorField = fieldOrder.find((field) => formErrors[field]);

      if (firstErrorField) {
        scrollToField(firstErrorField);
      }
    },
    [scrollToField]
  );

  const handleClickSubmit = useCallback(
    async (data: FormData) => {
      try {
        if (!currentForm || !currentUser.databaseUsers) return;

        if (isSelectedStudentSubmitted) {
          enqueueSnackbar('Form sudah diisi', { variant: 'error' });
          return;
        }

        if (totalQuestions !== selectedQuestions?.length) {
          const firstUnansweredQuestion = currentForm.criterias
            .flatMap((criteria) => criteria.questions.map((question) => ({ criteriaId: criteria.id, questionId: question.id })))
            .find(({ criteriaId, questionId }) => !selectedQuestions.some((item) => item.criteriaId === criteriaId && item.answerDetail.questionId === questionId));

          if (firstUnansweredQuestion) {
            scrollToField(getQuestionFieldName(firstUnansweredQuestion.criteriaId, firstUnansweredQuestion.questionId));
          }

          enqueueSnackbar('Mohon mengisi untuk semua pertanyaan', { variant: 'error' });
          return;
        }

        const formData: PayloadCreateFinalAssessmentInterface = {
          formId: currentForm?.id,
          studenId: data.student?.value as string,
          userId: currentUser?.databaseUsers?.id,
          score: finalAssessmentScore,
          catatan: data.catatan?.trim() || '',
          answers: finalAnswers,
        };

        await onCreateAssessment(formData);

        enqueueSnackbar('Jawaban berhasil dikirim');

        if (adminTeacherEmails.length > 0) {
          try {
            await sendNotificationEmail(adminTeacherEmails, `Wali Siswa Telah Mengisi Formulir: ${currentForm?.title}`, `${currentUser?.databaseUsers?.name} telah mengisi formulir.`);
          } catch (error: any) {
            console.error(error);
          }
        }

        router.push(paths.dashboard.form.root);
      } catch (error: any) {
        console.error(error);
        enqueueSnackbar(error.message, { variant: 'error' });
      }
    },
    [
      adminTeacherEmails,
      currentForm,
      currentUser.databaseUsers,
      enqueueSnackbar,
      finalAnswers,
      finalAssessmentScore,
      isSelectedStudentSubmitted,
      getQuestionFieldName,
      onCreateAssessment,
      router,
      scrollToField,
      selectedQuestions,
      totalQuestions,
    ]
  );
  const findCurrentPoint = useCallback(
    (criteriaId: string, questionId: string, checkedPoin: number): boolean =>
      finalAnswers.find((a) => a.criteriaId === criteriaId)?.answerDetails?.find((d) => d.questionId === questionId)?.point === checkedPoin,
    [finalAnswers]
  );

  const renderFormatGroupLabel = (group: GroupBase<OptionSelectInterface>) => {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium">{group.label ?? 'Unknown'}</span>
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit(handleClickSubmit, handleInvalidSubmit)} className="relative mt-5 w-full rounded-lg bg-white p-5 shadow-lg drop-shadow-md">
      <div className="absolute left-0 top-0 h-5 w-full rounded-t-lg bg-primary-1" />

      <div className="mt-6 flex flex-col gap-3">
        <p className="text-3xl font-semibold">{currentForm?.title}</p>

        {currentForm?.description && (
          <div className="rounded-lg bg-[#F3EAFC] px-4 py-2">
            <p className="font-semibold">Deskripsi :</p>
            <p className="text-sm">{currentForm.description}</p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg bg-primary-1 px-6 py-2">
        <p className="text-xl font-semibold text-white">Informasi Data Siswa dan Orang Tua/Wali</p>
      </div>

      {/* STUDENT NAME */}
      <div
        ref={(element) => {
          fieldRefs.current.student = element;
        }}
        className="mt-6 flex flex-col gap-1"
      >
        <p className="text-sm font-semibold text-[#404040]">Nama Siswa</p>

        <Controller
          name="student"
          control={control}
          rules={{ required: 'Harap isi bidang nama siswa.' }}
          render={({ field }) => (
            <SelectField {...field} placeholder="Pilih siswa" options={studentOptions} formatGroupLabel={renderFormatGroupLabel} components={{ IndicatorSeparator: () => null }} />
          )}
        />

        <ErrorMessage errors={errors} name="student" />
        {studentOptions.length === 0 && (
          <p role="status" className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
            {currentUser.databaseUsers?.role === 'parent' && parentStudents.length === 0
              ? 'Belum ada siswa yang bisa dipilih untuk akun wali ini. Pastikan data siswa sudah tersimpan dan akun Anda dipilih pada kolom Wali Siswa. Kelas siswa juga harus termasuk dalam kelas formulir.'
              : currentUser.databaseUsers?.role === 'parent'
                ? 'Siswa sudah terhubung, tetapi kelasnya belum tercakup dalam formulir ini. Hubungi guru atau admin untuk memastikan kelas pada formulir sesuai.'
                : 'Belum ada siswa yang cocok dengan kelas pada formulir ini. Periksa data siswa atau kelas formulir.'}
          </p>
        )}
        {currentUser.databaseUsers?.role === 'parent' && studentOptions.flatMap((group) => group.options).length > 1 && (
          <p className="mt-2 text-sm text-slate-500">Pilih anak yang akan dinilai. Pastikan siswa dan kelas yang dipilih sudah sesuai.</p>
        )}
      </div>

      {/* PARENT NAME */}
      <div
        ref={(element) => {
          fieldRefs.current.name = element;
        }}
        className="mt-6"
      >
        <InputField {...register('name', { required: 'Harap isi bidang nama anda.' })} disabled label="Nama Pengirim" placeholder="Masukan nama anda" labelClassname="font-semibold" />
        <ErrorMessage errors={errors} name="name" />
      </div>

      {/* PHONE NUMBER */}
      <div
        ref={(element) => {
          fieldRefs.current.phoneNumber = element;
        }}
        className="mt-6"
      >
        <InputField
          {...register('phoneNumber', { required: 'Harap isi bidang nomor telepon.' })}
          disabled
          type="number"
          label="Nomor Telepon Pengirim"
          placeholder="Masukan nomor telepon anda"
          labelClassname="font-semibold"
        />
        <ErrorMessage errors={errors} name="phoneNumber" />
      </div>

      {/* EMAIL */}
      <div
        ref={(element) => {
          fieldRefs.current.email = element;
        }}
        className="mt-6"
      >
        <InputField {...register('email', { required: 'Harap isi bidang email.' })} disabled type="email" label="Email Pengirim" placeholder="Masukan email anda" labelClassname="font-semibold" />
        <ErrorMessage errors={errors} name="email" />
      </div>

      <div className="mt-6 rounded-lg bg-primary-1 px-6 py-2">
        <p className="text-xl font-semibold text-white">Penilaian Siswa</p>
      </div>

      {currentForm?.notes && (
        <div className="mt-3 rounded-lg bg-[#F3EAFC] px-4 py-2">
          <p className="font-semibold">Catatan :</p>
          <p className="text-sm">{currentForm.notes}</p>
        </div>
      )}

      {/* QUESTION POINTS */}
      {currentForm?.criterias?.map((criteria, qi) => (
        <div key={qi} className="mt-6">
          <div className="border-b border-[#404040]">
            <p className="text-lg font-semibold text-[#404040]">
              {criteria.title.toUpperCase()}. {criteria.description}
            </p>
          </div>

          {criteria.questions?.map((question, li) => (
            <div
              key={li}
              ref={(element) => {
                fieldRefs.current[getQuestionFieldName(criteria.id, question.id)] = element;
              }}
              className="form-control mt-6 w-full gap-2"
            >
              <span className="text-sm font-semibold text-[#404040]">
                {li + 1}. {question.text}
              </span>

              <div className="mt-2 flex w-full flex-col gap-5 md:flex-row md:items-center">
                {[...ASSESSMENT_POINT_LIST].reverse().map((point) => (
                  <InputField
                    key={point.value}
                    type="radio"
                    name={`criteria.${criteria.id}.${question.id}`}
                    radioLabel={point.label}
                    checked={findCurrentPoint(criteria.id, question.id, point.value)}
                    disabled={isSelectedStudentSubmitted}
                    value={point.value}
                    onChange={() => handleChangeAssessmentPoint(criteria, question.id, point.value)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* NOTES */}
      <div className="mt-10 w-full border-t-2 border-dashed pt-4">
        <TextareaField
          {...register('catatan')}
          rows={4}
          label={currentUser?.databaseUsers?.role === 'admin' || currentUser?.databaseUsers?.role === 'teacher' ? 'Catatan Untuk Wali Siswa' : 'Catatan Untuk Guru'}
          placeholder={
            currentUser?.databaseUsers?.role === 'admin' || currentUser?.databaseUsers?.role === 'teacher' ? 'Tambahkan catatan untuk wali siswa (opsional)' : 'Tambahkan catatan untuk guru (opsional)'
          }
          labelClassname="font-semibold"
          inputClassname="min-h-[120px] resize-y"
        />
      </div>

      <div className="mt-10">
        {isSelectedStudentSubmitted && <p className="mb-3 text-center text-sm font-semibold text-red-600">Form sudah diisi</p>}

        <Button type="submit" disabled={isSubmitting || isSelectedStudentSubmitted} className="flex w-full flex-row items-center justify-center gap-2">
          {isSelectedStudentSubmitted ? 'Form sudah diisi' : 'Kirim Formulir'}
        </Button>
      </div>
    </form>
  );
};

export default InputForm;
