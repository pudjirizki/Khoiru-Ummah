export interface CriteriaInterface {
  id: string;
  formId: string;
  title: string;
  description: string;
  weight: number;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface CriteriasParamsInterface {
  formId?: string;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateCriteriaInterface {
  formId: string;
  title: string;
  description: string;
  weight: number;
}

export interface PayloadUpdateCriteriaInterface {
  formId?: string;
  title?: string;
  description?: string;
  weight?: number;
}
