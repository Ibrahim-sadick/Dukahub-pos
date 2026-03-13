import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { prisma } from './config/prisma';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';

export function createServer() {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());
  const allowedOrigins = new Set(
    String(env.CORS_ORIGIN || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.has('*') || allowedOrigins.has(origin)) return cb(null, true);
        return cb(null, false);
      },
      credentials: true
    })
  );
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/health/db', async (_req, res, next) => {
    try {
      await prisma.$executeRawUnsafe('SELECT 1');
      res.json({ ok: true, db: true });
    } catch (e) {
      next(e);
    }
  });

  app.use('/api', apiRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
