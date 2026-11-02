import { RoleUserType, StatusUserType } from './user';

// ----------------------------------------------------------------------

export interface PayloadLoginEmailAuthInterface {
  email: string;
  password: string;
}

export interface PayloadRegisterAuthInterface {
  name: string;
  nameLowercase: string;
  phoneNumber: string;
  role: RoleUserType;
  email: string;
  password: string;
  status: StatusUserType;
}

export interface PayloadUpdateAuthInterface {
  name?: string;
  nameLowercase?: string;
  phoneNumber?: string;
  role?: RoleUserType;
  email?: string;
  status?: StatusUserType;
}
