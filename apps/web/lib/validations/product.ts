import { z } from 'zod';

export const createProductSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters'),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'Price must be a valid amount'),
  quantity_available: z
    .string()
    .trim()
    .regex(/^\d+$/, 'Quantity must be a whole number')
    .refine((value) => Number(value) >= 1, 'Quantity must be at least 1'),
  category: z.string().trim().min(1, 'Category is required'),
  condition: z.string().trim().min(1, 'Condition is required'),
  status: z.string().trim().min(1, 'Status is required'),
  tags: z
    .array(z.string().trim().min(1))
    .max(20, 'Maximum 20 tags allowed'),
});

export type CreateProductFormInput = z.infer<typeof createProductSchema>;
