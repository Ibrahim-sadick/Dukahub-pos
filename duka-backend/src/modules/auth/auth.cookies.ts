import type { Response } from 'express';
import { env, isProduction } from '../../config/env';

const accessMaxAgeMs = 15 * 60 * 1000;
const refreshMaxAgeMs = 7 * 24 * 60 * 60 * 1000;
const cookieSameSite: 'none' | 'lax' = env.COOKIE_SECURE ? 'none' : 'lax';

const baseCookieOptions = {
  httpOnly: true,
  sameSite: cookieSameSite,
  secure: env.COOKIE_SECURE,
  path: '/'
};

const withDomain = <T extends Record<string, unknown>>(options: T): T => {
  const domain = String(env.COOKIE_DOMAIN || '').trim();
  if (!domain) return options;
  return { ...options, domain };
};

export const setSessionCookies = (res: Response, accessToken: string, refreshToken: string) => {
  res.cookie(
    'dh_access_token',
    accessToken,
    withDomain({
      ...baseCookieOptions,
      maxAge: accessMaxAgeMs
    })
  );
  res.cookie(
    'dh_refresh_token',
    refreshToken,
    withDomain({
      ...baseCookieOptions,
      maxAge: refreshMaxAgeMs
    })
  );
};

export const clearSessionCookies = (res: Response) => {
  const expires = new Date(0);
  res.cookie(
    'dh_access_token',
    '',
    withDomain({
      ...baseCookieOptions,
      expires,
      maxAge: 0
    })
  );
  res.cookie(
    'dh_refresh_token',
    '',
    withDomain({
      ...baseCookieOptions,
      expires,
      maxAge: 0
    })
  );
};

export const getCookieSecuritySummary = () => ({
  secure: env.COOKIE_SECURE,
  sameSite: cookieSameSite,
  httpOnly: baseCookieOptions.httpOnly,
  production: isProduction
});
