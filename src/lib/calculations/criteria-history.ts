import { ASSESSMENT_ROLE_WEIGHT } from '/src/constants/assessment';
import { FinalAssessmentInterface } from '/src/interfaces/final-assessment';
import { FinalFormInterface } from '/src/interfaces/final-form';

export interface CriteriaHistoryQuestion {
  id: string;
  title: string;
  teacherScore: number | null;
  parentScore: number | null;
  finalScore: number | null;
}

export interface CriteriaHistoryEntry {
  id: string;
  formId: string;
  formTitle: string;
  title: string;
  description: string;
  teacherScore: number | null;
  parentScore: number | null;
  finalScore: number | null;
  questions: CriteriaHistoryQuestion[];
}

const combineAvailableScores = (teacherScore: number | null, parentScore: number | null): number | null => {
  if (teacherScore !== null && parentScore !== null) {
    return teacherScore * ASSESSMENT_ROLE_WEIGHT.teacher + parentScore * ASSESSMENT_ROLE_WEIGHT.parent;
  }

  return teacherScore ?? parentScore;
};

const average = (scores: (number | null)[]) => {
  const availableScores = scores.filter((score): score is number => score !== null);
  if (!availableScores.length) return null;

  return availableScores.reduce((total, score) => total + score, 0) / availableScores.length;
};

export const buildCriteriaHistory = (
  form: FinalFormInterface | undefined,
  teacherAssessment: FinalAssessmentInterface | undefined,
  parentAssessment: FinalAssessmentInterface | undefined
): CriteriaHistoryEntry[] => {
  if (!form) return [];

  return (form.criterias ?? []).map((criteria) => {
    const teacherAnswer = teacherAssessment?.answers?.find((answer) => answer.criteriaId === criteria.id);
    const parentAnswer = parentAssessment?.answers?.find((answer) => answer.criteriaId === criteria.id);
    const teacherScore = teacherAnswer?.averagePoint ?? null;
    const parentScore = parentAnswer?.averagePoint ?? null;

    const questions = (criteria.questions ?? []).map((question) => {
      const teacherQuestion = teacherAnswer?.answerDetails?.find((detail) => detail.questionId === question.id);
      const parentQuestion = parentAnswer?.answerDetails?.find((detail) => detail.questionId === question.id);
      const questionTeacherScore = teacherQuestion?.point ?? null;
      const questionParentScore = parentQuestion?.point ?? null;

      return {
        id: question.id,
        title: question.text,
        teacherScore: questionTeacherScore,
        parentScore: questionParentScore,
        finalScore: combineAvailableScores(questionTeacherScore, questionParentScore),
      };
    });

    const questionAverage = average(questions.map((question) => question.finalScore));

    return {
      id: `${form.id}_${criteria.id}`,
      formId: form.id,
      formTitle: form.title,
      title: criteria.title,
      description: criteria.description,
      teacherScore,
      parentScore,
      finalScore: questionAverage ?? combineAvailableScores(teacherScore, parentScore),
      questions,
    };
  });
};
