import type { Role } from './common';

export type User = {
  id: string;
  full_name: string;
  email: string;
  school: string;
  is_verified: boolean;
  role: Role;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
};

export type AuthTokens = {
  access_token: string;
};

export type RegisterPayload = {
  full_name: string;
  email: string;
  password: string;
  school: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};
