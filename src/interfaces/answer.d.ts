export interface AnswerInterface {
  id: string;
  criteriaId: string;
  assessmentId: string;
  averagePoint: number;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface AnswersParamsInterface {
  assessmentId?: string;
  criteriaId?: string;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateAnswerInterface {
  criteriaId: string;
  assessmentId: string;
  averagePoint: number;
}

export interface PayloadUpdateAnswerInterface {
  criteriaId?: string;
  assessmentId?: string;
  averagePoint?: number;
}
