export type User = {
  email: string;
  full_name?: string;
  created_at: string;
  last_sign_in_at?: string;
  role: 'admin' | 'guest' | 'contributeur' | 'validateur' | 'admin_client';
  organization_name?: string | null;
  original_role?: string | null;
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
};

export type FormValues = {
  email: string;
  password: string;
  confirmPassword?: string;
  fullName?: string;
};

export type FormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  fullName?: string;
  form?: string;
};