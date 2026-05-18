import { z } from 'zod';

const noHtmlTags = (str: string) => !/<[^>]*>/.test(str);

export const createProductSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .refine(noHtmlTags, 'Title cannot contain HTML markup'),

  description: z
    .string()
    .trim()
    .max(2000, 'Description cannot exceed 2000 characters')
    .refine(noHtmlTags, 'Description cannot contain HTML markup')
    .optional()
    .or(z.literal('')),

  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a valid price (e.g. 49.99)')
    .refine((v) => Number(v) > 0, 'Price must be greater than 0')
    .refine((v) => Number(v) <= 1_000_000, 'Price cannot exceed GH₵1,000,000'),

  quantity_available: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Quantity must be a whole number')
    .refine((v) => Number(v) >= 1, 'Quantity must be at least 1')
    .refine((v) => Number(v) <= 100_000, 'Quantity cannot exceed 100,000'),

  category: z.string().trim().min(1, 'Please select a category'),

  condition: z.enum(['new', 'used', 'refurbished'], {
    error: () => 'Please select a valid condition',
  }),

  status: z.enum(['draft', 'active'], {
    error: () => 'Please select a valid status',
  }),

  tags: z
    .array(
      z
        .string()
        .trim()
        .min(1)
        .max(50, 'Each tag cannot exceed 50 characters')
        .refine(noHtmlTags, 'Tags cannot contain HTML')
    )
    .max(20, 'Maximum 20 tags allowed'),
});

export type CreateProductFormInput = z.infer<typeof createProductSchema>;
