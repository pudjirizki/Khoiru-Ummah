import { CriteriaInterface } from './criteria';
import { QuestionInterface } from './question';
import { FormInterface, FormsParamsInterface } from './form';

// ----------------------------------------------------------------------

export interface FinalFormInterface extends FormInterface {
  criterias: CriteriasFinalFormInterface[];
}

export interface CriteriasFinalFormInterface extends CriteriaInterface {
  questions: QuestionInterface[];
}

export interface FinalFormsParamsInterface extends FormsParamsInterface {}

export interface PayloadCreateFinalFormInterface {
  createdBy: string;
  title: string;
  class: string[];
  description: string;
  notes: string;
  criterias: PayloadCreateCriteriasFinalFormInterface[];
}

export interface PayloadCreateCriteriasFinalFormInterface {
  title: string;
  description: string;
  weight: number;
  questions: PayloadCreateQuestionsCriteriasFinalFormInterface[];
}

export interface PayloadCreateQuestionsCriteriasFinalFormInterface {
  order: number;
  text: string;
}

export interface PayloadUpdateFinalFormInterface {
  createdBy?: string;
  title?: string;
  class?: string[];
  description?: string;
  notes?: string;
  criterias?: PayloadUpdateCriteriasFinalFormInterface[];
}

export interface PayloadUpdateCriteriasFinalFormInterface {
  id?: string;
  title?: string;
  description?: string;
  weight?: number;
  questions?: PayloadUpdateQuestionsCriteriasFinalFormInterface[];
}

export interface PayloadUpdateQuestionsCriteriasFinalFormInterface {
  id?: string;
  order?: number;
  text?: string;
}

export interface TempGeneralFinalFormInterface {
  title: string;
  description: string;
  class: string[];
}

export interface TempAssessmentFinalFormInterface {
  notes: string;
  criterias: PayloadCreateCriteriasFinalFormInterface[];
}
