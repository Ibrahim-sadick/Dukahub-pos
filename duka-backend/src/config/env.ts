import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  APP_NAME: z.string().default('DukaHub Backend'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  CORS_ORIGIN: z.string().default(''),
  FRONTEND_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://127.0.0.1:3000,https://dukahub.co.tz,https://www.dukahub.co.tz'),
  TRUST_PROXY: z.coerce.number().int().min(0).default(1),
  COOKIE_DOMAIN: z.string().trim().optional(),
  COOKIE_SECURE: z.coerce.boolean().default(true)
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

const cookieSecure =
  process.env.COOKIE_SECURE == null ? parsed.data.NODE_ENV === 'production' : parsed.data.COOKIE_SECURE;

export const env = {
  ...parsed.data,
  COOKIE_SECURE: cookieSecure
};
export const isProduction = env.NODE_ENV === 'production';
