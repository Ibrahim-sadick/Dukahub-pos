import cookieParser from 'cookie-parser';
import cors, { type CorsOptions } from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found';
import { apiRouter } from './routes';

export const app = express();
app.set('trust proxy', env.TRUST_PROXY);

const normalizeOrigin = (value: string) => value.trim().replace(/\/+$/, '');
const DEFAULT_FRONTEND_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://dukahub.co.tz',
  'https://www.dukahub.co.tz'
];

const isApiOrigin = (value: string) => {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'api.dukahub.co.tz' || hostname.startsWith('api.');
  } catch {
    return false;
  }
};

const allowedOrigins = Array.from(
  new Set(
    [DEFAULT_FRONTEND_ORIGINS.join(','), env.FRONTEND_ORIGINS, env.CORS_ORIGIN]
      .flatMap((value) => String(value || '').split(','))
      .map((value) => normalizeOrigin(value))
      .filter((value) => Boolean(value) && !isApiOrigin(value))
  )
);

const allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const allowedHeaders = ['Content-Type', 'Authorization'];
const isAllowedOrigin = (origin?: string) => {
  if (!origin) return true;
  return allowedOrigins.includes(normalizeOrigin(origin));
};
const applyCorsHeaders = (origin: string | undefined, res: express.Response) => {
  const requestOrigin = typeof origin === 'string' ? normalizeOrigin(origin) : '';
  if (requestOrigin && isAllowedOrigin(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', allowedHeaders.join(', '));
  res.header('Access-Control-Allow-Methods', allowedMethods.join(', '));
};

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    callback(null, isAllowedOrigin(origin) ? true : false);
  },
  credentials: true,
  methods: allowedMethods,
  allowedHeaders,
  preflightContinue: false,
  maxAge: 86400,
  optionsSuccessStatus: 200
};

app.use((req, res, next) => {
  applyCorsHeaders(typeof req.headers.origin === 'string' ? req.headers.origin : undefined, res);
  next();
});
app.use(helmet());
app.use(cors(corsOptions));
app.options(/.*/, (req, res) => {
  applyCorsHeaders(typeof req.headers.origin === 'string' ? req.headers.origin : undefined, res);
  res.sendStatus(200);
});
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({ success: true, message: `${env.APP_NAME} is running` });
});

app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
