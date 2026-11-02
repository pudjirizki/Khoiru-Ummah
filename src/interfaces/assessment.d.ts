export interface AssessmentInterface {
  id: string;
  formId: string;
  studenId: string;
  studentClass?: string;
  catatan?: string;
  userId: string;
  score: number;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface AssessmentsParamsInterface {
  formId?: string;
  studentId?: string;
  userId?: string;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateAssessmentInterface {
  formId: string;
  studenId: string;
  studentClass?: string;
  catatan?: string;
  userId: string;
  score: number;
}

export interface PayloadUpdateAssessmentInterface {
  formId?: string;
  studenId?: string;
  studentClass?: string;
  catatan?: string;
  userId?: string;
  score?: number;
}
