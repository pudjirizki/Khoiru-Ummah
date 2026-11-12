import React, { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
// hooks
import { useFinalForm } from '/src/hooks/use-final-form';
import { useDatabaseUser } from '/src/hooks/use-database-user';
import { useDatabaseAnswer } from '/src/hooks/use-database-answer';
import { useFinalAssessment } from '/src/hooks/use-final-assessment';
import { useDatabaseCriteria } from '/src/hooks/use-database-criteria';
import { useDatabaseQuestion } from '/src/hooks/use-database-question';
import { useDatabaseAnswerDetail } from '/src/hooks/use-database-answer-detail';
// routes
import { paths } from '/src/routes/paths';
// constants
import { ASSESSMENT_POINT_LIST } from '/src/constants/assessment';
// interfaces
import { FinalFormInterface, TempAssessmentFinalFormInterface, TempGeneralFinalFormInterface } from '/src/interfaces/final-form';
// components
import { Button } from '/src/components/button';
//
import DetailSkeletonForm from '../detail/detail-skeleton-form';
import DetailForm from '../detail/detail-form';

// ----------------------------------------------------------------------

export interface FormContextStateInterface {
  currentTab: 'general' | 'assessment';
  generalForm: TempGeneralFinalFormInterface | null;
  assessmentForm: TempAssessmentFinalFormInterface | null;
}

export interface SummaryQuestionDistributionInterface {
  criteriaId: string;
  criteriaName: string;
  questions: {
    questionId: string;
    questionName: string;
    totalAnswer: number;
    distribution: {
      [k: string]: number;
    };
  }[];
}

// ----------------------------------------------------------------------

interface FormDetailViewProps {
  slug: string;
}

// ----------------------------------------------------------------------

const FormDetailView: React.FC<FormDetailViewProps> = ({ slug }) => {
  const [currentForm, setCurrentForm] = useState<FinalFormInterface | null>(null);

  const { currentUser } = useDatabaseUser();

  const { fetchFinalFormById } = useFinalForm();

  const { finalAssessments, finalAssessmentsList } = useFinalAssessment();

  const { allAnswersCache } = useDatabaseAnswer();

  const { allAnswerDetailsCache } = useDatabaseAnswerDetail();

  const { allCriteriasCache } = useDatabaseCriteria();

  const { allQuestionsCache } = useDatabaseQuestion();

  useEffect(() => {
    finalAssessments({ perPage: 50, formId: currentForm?.id });
  }, [currentForm?.id, finalAssessments]);

  // GET CURRENT FORM
  useEffect(() => {
    const fetch = async () => {
      const res = await fetchFinalFormById(slug);

      setCurrentForm(res);
    };

    fetch();
  }, [fetchFinalFormById, slug]);

  const getQuestionDistribution = (formId: string) => {
    const pointMap = new Map(ASSESSMENT_POINT_LIST.map((item) => [item.value, item.label]));

    const criterias = allCriteriasCache.filter((criteria) => criteria.formId === formId);

    const criteriaIds = new Set(criterias.map((criteria) => criteria.id));

    const questions = allQuestionsCache.filter((question) => criteriaIds.has(question.criteriaId));

    const assessments = finalAssessmentsList.filter((assessment) => assessment.formId === formId);

    const assessmentIds = new Set(assessments.map((assessment) => assessment.id));

    const answers = allAnswersCache.filter((answer) => assessmentIds.has(answer.assessmentId));

    const answerIds = new Set(answers.map((answer) => answer.id));

    const answerDetails = allAnswerDetailsCache.filter((detail) => answerIds.has(detail.answerId));

    return criterias.map((criteria) => {
      const criteriaQuestions = questions.filter((question) => question.criteriaId === criteria.id);

      return {
        criteriaId: criteria.id,
        criteriaName: criteria.description,

        questions: criteriaQuestions.map((question) => {
          const relatedDetails = answerDetails.filter((detail) => detail.questionId === question.id);

          const distribution = Object.fromEntries(ASSESSMENT_POINT_LIST.map((item) => [item.label, 0]));

          relatedDetails.forEach((detail) => {
            const label = pointMap.get(detail.point as 1 | 2 | 3 | 4);

            if (label) {
              distribution[label]++;
            }
          });

          return {
            questionId: question.id,
            questionName: question.text,
            totalAnswer: relatedDetails.length,
            distribution,
          };
        }),
      };
    });
  };

  const summary: SummaryQuestionDistributionInterface[] = getQuestionDistribution(currentForm?.id ?? '');

  return (
    <section>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md">
        <Button component="RouterLink" href={paths.dashboard.form.root} variant="gost" className="mb-4 flex w-fit items-center gap-2 rounded-xl px-0 text-slate-500 transition hover:text-primary-1">
          <Icon icon="ic:round-arrow-back-ios" width={18} />

          <span className="text-sm font-medium">Kembali ke Daftar Formulir</span>
        </Button>

        <div>
          <p className="text-sm font-medium uppercase tracking-widest text-slate-400">Informasi Formulir</p>

          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-1/10">
              <Icon icon="solar:document-text-bold" width={24} className="text-primary-1" />
            </div>

            <div>
              <h1 className="font-poppins text-3xl font-bold text-slate-800">Detail Formulir</h1>

              <p className="mt-1 text-sm text-slate-500">Lihat informasi lengkap, pertanyaan, dan hasil yang terkait dengan formulir ini.</p>
            </div>
          </div>
        </div>
      </div>

      {currentForm && currentUser ? <DetailForm currentForm={currentForm} summary={summary} /> : <DetailSkeletonForm />}
    </section>
  );
};

export default FormDetailView;
