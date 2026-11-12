export interface StudentInterface {
  id: string;
  parentId: string;
  name: string;
  nameLowercase: string;
  class: string;
  identityNumber: string;
  updatedAt: Date;
  createdAt: Date;
}

export interface StudentsParamsInterface {
  class?: string;
  parentId?: string;
  search?: string;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateStudentInterface {
  parentId?: string;
  name: string;
  nameLowercase: string;
  class: string;
  identityNumber: string;
}

export interface PayloadUpdateStudentInterface {
  parentId?: string;
  name?: string;
  nameLowercase?: string;
  class?: string;
  identityNumber?: string;
}
