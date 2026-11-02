export interface FormInterface {
  id: string;
  createdBy: string;
  title: string;
  class: string[];
  description: string;
  notes: string;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface FormsParamsInterface {
  class?: string;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateFormInterface {
  createdBy: string;
  title: string;
  class: string[];
  description: string;
  notes: string;
}

export interface PayloadUpdateFormInterface {
  createdBy?: string;
  title?: string;
  class?: string[];
  description?: string;
  notes?: string;
}
