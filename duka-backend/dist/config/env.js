"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const zod_1 = require("zod");
dotenv_1.default.config();
const envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'test', 'production']).default('development'),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    DATABASE_URL: zod_1.z.string().min(1),
    JWT_ACCESS_SECRET: zod_1.z.string().min(16),
    JWT_REFRESH_SECRET: zod_1.z.string().min(16),
    JWT_ACCESS_TTL_SECONDS: zod_1.z.coerce.number().int().positive().default(900),
    JWT_REFRESH_TTL_DAYS: zod_1.z.coerce.number().int().positive().default(30),
    CORS_ORIGIN: zod_1.z.string().min(1).default('http://localhost:3000'),
    MINIO_ENDPOINT: zod_1.z.string().min(1).default('localhost'),
    MINIO_PORT: zod_1.z.coerce.number().int().positive().default(9000),
    MINIO_USE_SSL: zod_1.z.coerce.boolean().default(false),
    MINIO_ACCESS_KEY: zod_1.z.string().min(1).default('minioadmin'),
    MINIO_SECRET_KEY: zod_1.z.string().min(1).default('minioadmin'),
    MINIO_BUCKET: zod_1.z.string().min(1).default('duka-files')
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    process.stderr.write(`Invalid environment variables. Create .env from .env.example\n`);
    process.stderr.write(`${JSON.stringify(parsed.error.format(), null, 2)}\n`);
    process.exit(1);
}
exports.env = parsed.data;
