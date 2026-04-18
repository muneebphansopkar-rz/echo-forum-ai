import { z } from 'zod';

/**
 * Validated at startup. The app refuses to boot if required vars are missing
 * or malformed — one of the "never break" rules in apps/api/CONTEXT.md.
 */
export const configSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().int().positive().default(3001),
  API_PREFIX: z.string().default('/api/v1'),

  DATABASE_URL: z.string().url(),
  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  REDIS_URL: z.string().url(),

  SKEP_JWT_SECRET: z.string().min(16, 'SKEP_JWT_SECRET must be >= 16 chars'),
  JWT_AUDIENCE: z.string().default('skep-forum'),
  JWT_ISSUER: z.string().default('skep-api'),

  THROTTLE_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),

  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

export type AppConfig = z.infer<typeof configSchema>;
