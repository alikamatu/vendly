import { z } from 'zod';

export const createStoreSchema = z.object({
  store_name: z.string().min(2, 'Store name must be at least 2 characters'),
  store_link: z
    .string()
    .min(2, 'Store link must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Store link can only contain lowercase letters, numbers, and hyphens'),
  bio: z.string().max(500, 'Bio must be less than 500 characters').optional(),
  whatsapp_number: z
    .string()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid WhatsApp number format')
    .optional()
    .or(z.literal('')),
});

export type CreateStoreInput = z.infer<typeof createStoreSchema>;
