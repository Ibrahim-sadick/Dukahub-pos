import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthContext, JwtTokenType } from './types';

const accessExpiry = env.JWT_ACCESS_EXPIRES_IN as jwt.SignOptions['expiresIn'];
const refreshExpiry = env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'];

export const hashPassword = (value: string) => bcrypt.hash(value, env.BCRYPT_SALT_ROUNDS);
export const verifyPassword = (value: string, hash: string) => bcrypt.compare(value, hash);

export const signAccessToken = (payload: Omit<AuthContext, 'tokenType'>) => {
  return jwt.sign({ ...payload, tokenType: 'access' satisfies JwtTokenType }, env.JWT_ACCESS_SECRET, {
    expiresIn: accessExpiry
  });
};

export const signRefreshToken = (payload: Omit<AuthContext, 'tokenType'>) => {
  return jwt.sign({ ...payload, tokenType: 'refresh' satisfies JwtTokenType }, env.JWT_REFRESH_SECRET, {
    expiresIn: refreshExpiry
  });
};

export const verifyAccessToken = (token: string) => jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthContext;
export const verifyRefreshToken = (token: string) => jwt.verify(token, env.JWT_REFRESH_SECRET) as AuthContext;
