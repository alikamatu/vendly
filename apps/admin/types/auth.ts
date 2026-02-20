export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  full_name: string;
  email: string;
  role: "USER" | "ADMIN";
  is_verified: boolean;
  approval_status: "PENDING" | "APPROVED" | "REJECTED" | null;
  has_verification_doc: boolean;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

export interface ApiError {
  statusCode: number;
  message: string[];
  timestamp: string;
  path: string;
}

export type AuthState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: LoginResponse };
