import { RoleUserType } from './user';

// ----------------------------------------------------------------------

export interface NotificationInterface {
  id: string;
  userId: string;
  formId: string;
  name: string;
  description: string;
  targetRole: RoleUserType;
  isRead: boolean;
  updatedAt: Date | string;
  createdAt: Date | string;
}

export interface NotificationsParamsInterface {
  userId?: string;
  formId?: string;
  targetRole?: RoleUserType;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateNotificationInterface {
  userId: string;
  formId: string;
  name: string;
  description: string;
  targetRole: RoleUserType;
  isRead: boolean;
}

export interface PayloadUpdateNotificationInterface {
  userId?: string;
  formId?: string;
  name?: string;
  description?: string;
  targetRole?: RoleUserType;
  isRead?: boolean;
}
