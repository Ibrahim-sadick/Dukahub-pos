import { Client } from 'minio';
import { env } from '../config/env';

export const minio = new Client({
  endPoint: env.MINIO_ENDPOINT,
  port: env.MINIO_PORT,
  useSSL: env.MINIO_USE_SSL,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY
});

export async function ensureBucket(bucket = env.MINIO_BUCKET) {
  const exists = await minio.bucketExists(bucket);
  if (exists) return;
  await minio.makeBucket(bucket, '');
}

