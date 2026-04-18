import { z } from 'zod';
import { postSummarySchema } from './common';

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  tag: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
export type SearchQuery = z.infer<typeof searchQuerySchema>;

export const searchResultSchema = postSummarySchema.extend({
  highlights: z.object({
    title: z.string().nullable(),
    body: z.string().nullable(),
  }),
});
export type SearchResult = z.infer<typeof searchResultSchema>;
