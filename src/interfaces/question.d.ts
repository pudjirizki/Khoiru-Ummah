export interface QuestionInterface {
  id: string;
  criteriaId: string;
  order: number;
  text: string;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface QuestionsParamsInterface {
  criteriaId?: string;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateQuestionInterface {
  criteriaId: string;
  order: number;
  text: string;
}

export interface PayloadUpdateQuestionInterface {
  criteriaId?: string;
  order?: number;
  text?: string;
}
