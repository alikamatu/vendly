export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  USERS: "/users",
  APPROVALS: "/approvals",
} as const;

export const AUTH_STORAGE_KEYS = {
  TOKEN: "admin_token",
  USER: "admin_user",
  THEME: "admin-theme",
} as const;

export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD_MIN_LENGTH: 8,
} as const;
