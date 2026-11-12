import { AssessmentInterface, AssessmentsParamsInterface } from './assessment';
import { AnswerInterface } from './answer';
import { AnswerDetailInterface } from './answer-details';

// ----------------------------------------------------------------------

export interface FinalAssessmentInterface extends AssessmentInterface {
  answers: AnswersFinalAssessmentInterface[];
}

export interface AnswersFinalAssessmentInterface extends AnswerInterface {
  answerDetails: AnswerDetailInterface[];
}

export interface FinalAssessmentsParamsInterface extends AssessmentsParamsInterface {}

export interface PayloadCreateFinalAssessmentInterface {
  formId: string;
  studenId: string;
  studentClass?: string;
  catatan?: string;
  userId: string;
  score: number;
  answers: PayloadCreateAnswersFinalAssessmentInterface[];
}

export interface PayloadCreateAnswersFinalAssessmentInterface {
  criteriaId: string;
  averagePoint: number;
  answerDetails: PayloadCreateAnswerDetailsAnswersFinalAssessmentInterface[];
}

export interface PayloadCreateAnswerDetailsAnswersFinalAssessmentInterface {
  questionId: string;
  point: number;
}

export interface PayloadUpdateFinalAssessmentInterface {
  formId?: string;
  studenId?: string;
  studentClass?: string;
  catatan?: string;
  userId?: string;
  score?: number;
  answers?: PayloadUpdateAnswersFinalAssessmentInterface[];
}

export interface PayloadUpdateAnswersFinalAssessmentInterface {
  id?: string;
  criteriaId?: string;
  assessmentId?: string;
  averagePoint?: number;
  answerDetails?: PayloadUpdateAnswerDetailsAnswersFinalAssessmentInterface[];
}

export interface PayloadUpdateAnswerDetailsAnswersFinalAssessmentInterface {
  id?: string;
  questionId?: string;
  answerId?: string;
  point?: number;
}
