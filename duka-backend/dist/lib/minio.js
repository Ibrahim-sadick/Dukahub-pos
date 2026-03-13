"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minio = void 0;
exports.ensureBucket = ensureBucket;
const minio_1 = require("minio");
const env_1 = require("../config/env");
exports.minio = new minio_1.Client({
    endPoint: env_1.env.MINIO_ENDPOINT,
    port: env_1.env.MINIO_PORT,
    useSSL: env_1.env.MINIO_USE_SSL,
    accessKey: env_1.env.MINIO_ACCESS_KEY,
    secretKey: env_1.env.MINIO_SECRET_KEY
});
async function ensureBucket(bucket = env_1.env.MINIO_BUCKET) {
    const exists = await exports.minio.bucketExists(bucket);
    if (exists)
        return;
    await exports.minio.makeBucket(bucket, '');
}
