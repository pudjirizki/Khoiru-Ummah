export interface ResultInterface {
  id: string;
  teacherAssessmentId: string;
  parentAssessmentId: string;
  finalScore: number;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface PayloadCreateResultInterface {
  teacherAssessmentId: string;
  parentAssessmentId: string;
  finalScore: number;
}

export interface PayloadUpdateResultInterface {
  teacherAssessmentId?: string;
  parentAssessmentId?: string;
  finalScore?: number;
}
