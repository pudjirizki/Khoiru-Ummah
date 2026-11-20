import { User } from '@supabase/supabase-js';

// ----------------------------------------------------------------------

export interface CurrentUserInterface {
  id: string;
  email: string;
  uid: string; // alias untuk auth id (Supabase user.id)
  databaseUsers: UserInterface | null;
  photoURL?: string | null;
  displayName?: string | null;
}

export interface UserInterface {
  id: string;
  authId: string;
  name: string;
  nameLowercase: string;
  phoneNumber: string;
  role: RoleUserType;
  email: string;
  status: StatusUserType;
  updatedAt: Date;
  createdAt: Date;
}

export interface UsersParamsInterface {
  search?: string;
  role?: RoleUserType | null;
  status?: StatusUserType | null;
  limit?: number;
  perPage?: number;
}

export interface PayloadCreateUserInterface {
  name: string;
  nameLowercase: string;
  phoneNumber: string;
  role: RoleUserType;
  email: string;
  status: StatusUserType;
}

export type RoleUserType = 'admin' | 'teacher' | 'parent';

export type StatusUserType = 'active' | 'inactive';
