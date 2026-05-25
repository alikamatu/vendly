import { useState } from 'react';
import { useAuth } from '@/lib/contexts/auth-context';
import { useForm } from 'react-hook-form';
import { authApi } from '@/lib/api/auth';
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
  const [totpRequired, setTotpRequired] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [method, setMethod] = useState<'TOTP' | 'SMS'>('TOTP');
  const [phoneHint, setPhoneHint] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  const onSubmit = form.handleSubmit(async (data) => {
    const result = await login(data.email, data.password);
    if (result && (result as any).totp_required) {
      setTotpRequired(true);
      setMethod(((result as any).method as 'TOTP' | 'SMS') || 'TOTP');
      setPhoneHint(((result as any).phone_hint as string | null) ?? null);
    }
  });

  const submitWithCode = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    const { email, password } = form.getValues();
    await login(email, password, useBackupCode
      ? { totp_backup_code: trimmed }
      : { totp_code: trimmed });
  };

  const resendSms = async () => {
    if (resending || method !== 'SMS') return;
    setResending(true);
    try {
      const { email, password } = form.getValues();
      const res = await authApi.twoFactorSmsResend(email, password);
      if (res?.phone_hint) setPhoneHint(res.phone_hint);
    } finally {
      setResending(false);
    }
  };

  const resetTotpChallenge = () => {
    setTotpRequired(false);
    setUseBackupCode(false);
    setMethod('TOTP');
    setPhoneHint(null);
  };

  return {
    form,
    onSubmit,
    isLoading,
    error,
    clearError,
    totpRequired,
    useBackupCode,
    setUseBackupCode,
    submitWithCode,
    resetTotpChallenge,
    method,
    phoneHint,
    resendSms,
    resending,
  };
}

export function useRegisterForm() {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      school: '',
      // Zod requires literal `true` — we leave it false until the user ticks.
      accept_terms: false as unknown as true,
      marketing_opt_in: false,
    },
  });

  /**
   * Returns `true` only when the API call actually completed. Returns `false`
   * when react-hook-form's resolver rejected the input (validation errors are
   * displayed inline) so the caller can avoid showing a success screen.
   * Re-throws API errors so the caller's catch can still react.
   */
  const onSubmit = async (e?: React.BaseSyntheticEvent): Promise<boolean> => {
    let succeeded = false;
    await form.handleSubmit(async (data) => {
      const { confirmPassword, ...rest } = data;
      await registerUser(rest as any);
      succeeded = true;
    })(e);
    return succeeded;
  };

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