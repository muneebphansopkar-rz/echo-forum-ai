import { z } from 'zod';

export const createTagSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'lowercase kebab-case'),
  label: z.string().min(1).max(40),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .describe('hex — e.g. #3b6ef5'),
});
export type CreateTagInput = z.infer<typeof createTagSchema>;
