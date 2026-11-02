export interface AnswerDetailInterface {
  id: string;
  questionId: string;
  answerId: string;
  point: number;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface AnswerDetailsParamsInterface {
  questionId?: string;
  answerId?: string;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateAnswerDetailInterface {
  questionId: string;
  answerId: string;
  point: number;
}

export interface PayloadUpdateAnswerDetailInterface {
  questionId?: string;
  answerId?: string;
  point?: number;
}
