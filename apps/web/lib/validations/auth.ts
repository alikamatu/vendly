import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

/**
 * Ghana phone normaliser used at form submission. Strips spaces, dashes,
 * parens, and a leading "0" (Ghana local format), then validates with
 * libphonenumber-js. Returns the E.164 form on success.
 *
 * Kept in lockstep with apps/api/src/auth/phone.util.ts — same rules,
 * same defaults. Backend re-validates regardless, this just gives the
 * user inline feedback before the round-trip.
 */
export function normalizeGhanaPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let cleaned = raw.replace(/[\s\-().]/g, '');
  if (!cleaned) return null;
  if (cleaned.startsWith('0') && !cleaned.startsWith('+')) {
    cleaned = cleaned.replace(/^0+/, '');
  }
  const candidate = cleaned.startsWith('+') ? cleaned : `+233${cleaned}`;
  const parsed = parsePhoneNumberFromString(candidate, 'GH');
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
  password: z.string().min(1, 'Please enter your password.'),
});

export const registerSchema = z
  .object({
    full_name: z.string().min(2, 'Please enter your full name.'),
    email: z.string().email('Please enter a valid email address.'),
    password: z
      .string()
      .min(8, 'Your password needs at least 8 characters.')
      .regex(
        /((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/,
        'Make your password stronger: include an uppercase letter, a lowercase letter, and a number or symbol.'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
    // BUYER signs up to shop. SELLER additionally provides a business name
    // up front so we can pre-fill their store profile during verification.
    // Either way the backend creates the user with role=USER; SELLER role
    // is only granted after the admin approval flow completes.
    account_type: z.enum(['BUYER', 'SELLER']),
    // `school` is the legacy DB column name; UI labels it as Business name.
    // Always a string in the form (defaultValues sets ''); we only require
    // non-empty when account_type is SELLER, via the superRefine below.
    school: z.string(),
    // Phone is required at signup so Pro sellers can receive SMS order
    // alerts and so 2FA can fall back to SMS. The string here can be in
    // any human format ("0244...", "+233...", "024 412 3456"); we
    // validate via libphonenumber inside the superRefine below.
    phone: z
      .string()
      .min(7, 'Please enter your phone number.')
      .max(20, 'Phone number is too long.'),
    accept_terms: z.literal(true, {
      message:
        'Please agree to the Terms of Service and Privacy Policy to create an account.',
    }),
    marketing_opt_in: z.boolean().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Those passwords don't match — please re-enter them.",
    path: ['confirmPassword'],
  })
  .superRefine((data, ctx) => {
    if (data.account_type === 'SELLER' && (!data.school || data.school.trim().length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['school'],
        message: 'Please tell us your business name.',
      });
    }
    // Validate the phone via libphonenumber. Cheaper UX than waiting
    // for the API round-trip to surface the same error.
    const normalised = normalizeGhanaPhone(data.phone);
    if (!normalised) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message:
          "That number doesn't look right. Use a Ghana number — e.g. 024 412 3456.",
      });
    }
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address.'),
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