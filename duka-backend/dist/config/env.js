"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProduction = exports.env = void 0;
const dotenv_1 = require("dotenv");
const zod_1 = require("zod");
(0, dotenv_1.config)();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    DATABASE_URL: zod_1.z.string().min(1),
    APP_NAME: zod_1.z.string().default('DukaHub Backend'),
    JWT_ACCESS_SECRET: zod_1.z.string().min(16),
    JWT_REFRESH_SECRET: zod_1.z.string().min(16),
    JWT_ACCESS_EXPIRES_IN: zod_1.z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: zod_1.z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: zod_1.z.coerce.number().int().min(8).max(15).default(12),
    CORS_ORIGIN: zod_1.z.string().default(''),
    FRONTEND_ORIGINS: zod_1.z
        .string()
        .default('http://localhost:3000,http://127.0.0.1:3000,https://dukahub.co.tz,https://www.dukahub.co.tz'),
    TRUST_PROXY: zod_1.z.coerce.number().int().min(0).default(1),
    COOKIE_DOMAIN: zod_1.z.string().trim().optional(),
    COOKIE_SECURE: zod_1.z.coerce.boolean().default(true)
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment configuration');
}
const cookieSecure = process.env.COOKIE_SECURE == null ? parsed.data.NODE_ENV === 'production' : parsed.data.COOKIE_SECURE;
exports.env = {
    ...parsed.data,
    COOKIE_SECURE: cookieSecure
};
exports.isProduction = exports.env.NODE_ENV === 'production';
//# sourceMappingURL=env.js.map