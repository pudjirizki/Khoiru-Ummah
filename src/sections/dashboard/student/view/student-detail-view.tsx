import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '@iconify/react';
// routes
import { paths } from '/src/routes/paths';
// hooks
import { useBoolean } from '/src/hooks/use-boolean';
import { useFinalForm } from '/src/hooks/use-final-form';
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseStudent } from '/src/hooks/use-database-student';
import { useFinalAssessment } from '/src/hooks/use-final-assessment';
import { useDatabaseCriteria } from '/src/hooks/use-database-criteria';
// constants
import { ASSESSMENT_POINT_LIST } from '/src/constants/assessment';
// interfaces
import { StudentInterface } from '/src/interfaces/student';
import { FinalFormInterface } from '/src/interfaces/final-form';
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
// components
import { Button } from '/src/components/button';
//
import DetailCardSkeleton from '../detail/detail-card-skeleton';
import DetailStudentProfile from '../detail/detail-student-profile';
import DetailChartAssessment from '../detail/detail-chart-assessment';
import DetailHistoryAssessment from '../detail/detail-history-assessment';

// ----------------------------------------------------------------------

interface StudentDetailViewProps {
  slug: string;
}

interface MicroDetailsInterface {
  criteriaName: string;
  microDetails: {
    questionId: string;
    questionName: string;
    point: number;
    pointName: string;
  }[];
  id: string;
  criteriaId: string;
  assessmentId: string;
  averagePoint: number;
  updatedAt: string | Date;
  createdAt: string | Date;
}
[];

export interface FormAnswerMicroDetailsInterface {
  teacher: MicroDetailsInterface[];
  parent: MicroDetailsInterface[];
}

const mergeUniqueForms = <T extends { id?: string }>(currentForms: T[], historyForms: T[]) => {
  const map = new Map<string, T>();

  [...currentForms, ...historyForms].forEach((form) => {
    if (form?.id) {
      map.set(form.id, form);
    }
  });

  return Array.from(map.values());
};

// ----------------------------------------------------------------------

const StudentDetailView: React.FC<StudentDetailViewProps> = ({ slug }) => {
  const [selectedStudent, setSelectedStudent] = useState<StudentInterface | null>(null);

  const [studentForms, setStudentForms] = useState<FinalFormInterface[]>([]);

  const [studentAssessments, setStudentAssessments] = useState<FinalAssessmentInterface[]>([]);

  const [selectedFormId, setSelectedFormId] = useState('');

  const { value: isLoadingValue, onTrue: showLoading, onFalse: hideLoading } = useBoolean(false);

  const { allCriteriasCache } = useDatabaseCriteria();

  const { currentUser, allUsersCache } = useDatabaseUser();

  const { allFinalFormsCache, fetchFinalFormById } = useFinalForm();

  const { allFinalAssessmentsCache, fetchFinalAssessmentById } = useFinalAssessment();

  const { allStudentsCache } = useDatabaseStudent();

  // FILTER SELECTED STUDENT
  useEffect(() => {
    const filteredStudents = allStudentsCache?.find((s) => s.id === slug);

    if (!filteredStudents) {
      return;
    }

    setSelectedStudent(filteredStudents);
  }, [allStudentsCache, slug]);

  // STUDENT FORMS, STUDENT ASSESSMENTS
  useEffect(() => {
    if (!selectedStudent?.id) {
      setStudentForms([]);
      setStudentAssessments([]);
      setSelectedFormId('');
      return;
    }

    const selectedStudentClass = selectedStudent.class;

    let isMounted = true;

    const fetchData = async () => {
      try {
        showLoading();
        setSelectedFormId('');
        setStudentForms([]);
        setStudentAssessments([]);

        const assefiltered = allFinalAssessmentsCache.filter((a) => a.studenId === selectedStudent.id);
        const assessedFormIds = new Set(assefiltered.map((a) => a.formId));

        const currentClassForms = allFinalFormsCache.filter((form) => form.class.includes(selectedStudentClass));
        const historyForms = allFinalFormsCache.filter((form) => assessedFormIds.has(form.id));
        const formFiltered = mergeUniqueForms(currentClassForms, historyForms);

        const formResponses = await Promise.all(formFiltered.map((f) => fetchFinalFormById(f.id)));
        const asseResponses = await Promise.all(assefiltered.map((a) => fetchFinalAssessmentById(a.id)));

        const sorted = [...formResponses].sort((a, b) => {
          const dateA = new Date(((a as FinalFormInterface).createdAt as string).replace(' at ', ' '));
          const dateB = new Date(((b as FinalFormInterface).createdAt as string).replace(' at ', ' '));
          return dateB.getTime() - dateA.getTime();
        });

        if (isMounted) {
          setStudentForms(sorted as FinalFormInterface[]);
          setStudentAssessments(asseResponses as FinalAssessmentInterface[]);
        }
      } catch (error) {
        console.error(error);
      } finally {
        hideLoading();
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [allFinalAssessmentsCache, fetchFinalAssessmentById, fetchFinalFormById, allFinalFormsCache, hideLoading, selectedStudent?.class, selectedStudent?.id, showLoading]);

  const selectedForm = useMemo(() => studentForms.find((form) => form.id === selectedFormId), [selectedFormId, studentForms]);
  const formAssessments = useMemo(() => studentAssessments.filter((assessment) => assessment.formId === selectedFormId), [selectedFormId, studentAssessments]);

  const formAnswerMicroDetails = useMemo<FormAnswerMicroDetailsInterface>(() => {
    const userMap = new Map(allUsersCache.map((user) => [user.id, user]));
    const criteriaMap = new Map((selectedForm?.criterias ?? []).map((criteria) => [criteria.id, criteria]));
    const questionMap = new Map(
      (selectedForm?.criterias ?? []).flatMap((criteria) => criteria.questions.map((question) => [question.id, question.text] as const))
    );
    const pointMap = new Map(ASSESSMENT_POINT_LIST.map((point) => [point.value, point.label]));

    const getRoleAnswers = (role: 'teacher' | 'parent') => {
      const assessment = formAssessments.find((item) => userMap.get(item.userId)?.role === role);
      if (!assessment) return [];

      return assessment.answers.map((answer) => ({
        ...answer,
        criteriaName: criteriaMap.get(answer.criteriaId)?.description || criteriaMap.get(answer.criteriaId)?.title || '',
        microDetails: answer.answerDetails.map((detail) => ({
          questionId: detail.questionId,
          questionName: questionMap.get(detail.questionId) ?? '',
          point: detail.point,
          pointName: pointMap.get(detail.point as 1 | 2 | 3 | 4) ?? '',
        })),
      }));
    };

    return {
      teacher: getRoleAnswers('teacher'),
      parent: getRoleAnswers('parent'),
    };
  }, [allUsersCache, formAssessments, selectedForm]);

  return (
    <section>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
        <Button component="RouterLink" href={paths.dashboard.student.root} variant="gost" className="mb-5 flex w-fit items-center gap-2 text-slate-500 transition hover:text-primary-1">
          <Icon icon="ic:round-arrow-back-ios" width={18} />

          <span className="text-sm font-medium">Kembali ke Daftar Siswa</span>
        </Button>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-1/10">
            <Icon icon="solar:user-speak-rounded-bold" width={32} className="text-primary-1" />
          </div>

          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Informasi Siswa</p>

            <h1 className="mt-1 font-poppins text-3xl font-bold text-slate-800">Detail Siswa</h1>

            <p className="mt-2 text-sm text-slate-500">Lihat informasi lengkap dan data siswa yang telah terdaftar.</p>
          </div>
        </div>
      </div>

      {selectedStudent && (
        <div className="mt-5 flex flex-col justify-between gap-5 lg:flex-row">
          <DetailStudentProfile
            currentUser={currentUser}
            selectedStudent={selectedStudent}
            students={allStudentsCache}
            users={allUsersCache}
            setSelectedStudent={setSelectedStudent}
            className="w-full"
          />
        </div>
      )}

      {selectedStudent && !isLoadingValue ? (
        <div className="mt-10 flex flex-col gap-6">
          <DetailHistoryAssessment
            student={selectedStudent}
            forms={studentForms}
            assessments={studentAssessments}
            users={allUsersCache}
            selectedFormId={selectedFormId}
            setSelectedFormId={setSelectedFormId}
          />

          {selectedFormId && (
            <DetailChartAssessment
              form={selectedForm}
              currentUser={currentUser}
              users={allUsersCache}
              allCriteriasCache={allCriteriasCache}
              formAssessments={formAssessments}
              formAnswerMicroDetails={formAnswerMicroDetails}
              selectedStudent={selectedStudent}
              selectedForm={selectedForm}
            />
          )}
        </div>
      ) : (
        <div className="mt-10">
          <DetailCardSkeleton />
        </div>
      )}
    </section>
  );
};

export default StudentDetailView;
