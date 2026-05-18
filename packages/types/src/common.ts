export type Role = 'USER' | 'SELLER' | 'ADMIN';

export type ApiResponse<T> = {
  data: T;
  message?: string;
  statusCode: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ApiError = {
  message: string;
  statusCode: number;
  error?: string;
};
