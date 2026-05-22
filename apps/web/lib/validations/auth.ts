import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
        'Password must contain uppercase, lowercase, and a number or special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    // `school` is the legacy backend field name; UI labels it as Business name.
    school: z.string().min(2, 'Business name is required'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
        'Password must contain uppercase, lowercase, and a number or special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const verificationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('URL'),
    verification_doc: z.string().url('Please provide a valid URL').min(1, 'Document URL is required'),
  }),
  z.object({
    type: z.literal('FILES'),
    idImage: z.any().optional(), // Handled by manual validation or pre-upload
    salesProof: z.any().optional(),
  }),
  z.object({
    type: z.literal('CONTACT'),
    method: z.enum(['WHATSAPP', 'EMAIL', 'PHONE']),
  }),
]);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerificationInput = z.infer<typeof verificationSchema>;