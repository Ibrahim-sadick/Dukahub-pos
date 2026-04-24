import type { Request } from 'express';

export type JwtTokenType = 'access' | 'refresh';

export interface AuthContext {
  userId: string;
  businessId: string;
  role: string;
  permissions: string[];
  sessionId: string;
  tokenType: JwtTokenType;
}

export type AuthenticatedRequest = Request & {
  auth?: AuthContext;
};
