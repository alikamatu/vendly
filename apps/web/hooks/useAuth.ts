import { useAuth } from '@/lib/auth-context';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verificationSchema,
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  VerificationInput,
} from '@/lib/validations/auth';

export function useLoginForm() {
  const { login, isLoading, error, clearError } = useAuth();
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    await login(data.email, data.password);
  });

  return { form, onSubmit, isLoading, error, clearError };
}

export function useRegisterForm() {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirmPassword: '', school: '' },
  });

  const onSubmit = form.handleSubmit(async (data) => {
    const { confirmPassword, ...rest } = data;
    return registerUser(rest);
  });

  return { form, onSubmit, isLoading, error, clearError };
}

export function useForgotPasswordForm() {
  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  return { form };
}

export function useResetPasswordForm() {
  const form = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  return { form };
}

export function useVerificationForm() {
  const form = useForm<VerificationInput>({
    resolver: zodResolver(verificationSchema),
    defaultValues: { type: 'URL', verification_doc: '' },
  });

  return { form };
}