import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
import { authenticate } from '../../middleware/authenticate.js';
import * as service from './auth.service.js';
import { env } from '../../config/env.js';
import { createAuthRateLimiters, type AuthRateLimitConfig } from './auth-rate-limit.js';

const credentials = (body: unknown) => {
  const value = body as { email?: unknown; password?: unknown };
  if (typeof value?.email !== 'string' || !/^\S+@\S+\.\S+$/.test(value.email) || typeof value.password !== 'string' || value.password.length < 8) throw new HttpError(400, 'Email valide et mot de passe de 8 caractères minimum requis');
  return { email: value.email, password: value.password };
};
const token = (body: unknown) => {
  const value = (body as { refreshToken?: unknown })?.refreshToken;
  if (typeof value !== 'string' || value.length < 20) throw new HttpError(400, 'Refresh token requis');
  return value;
};

export function createAuthRouter(rateLimitConfig: AuthRateLimitConfig = env.authRateLimit) {
  const router = Router();
  const limits = createAuthRateLimiters(rateLimitConfig);
  router.post('/login', ...limits.login, asyncHandler(async (request, response) => { const input=credentials(request.body); response.json(await service.login(input.email,input.password)); }));
  router.post('/refresh', limits.refresh, asyncHandler(async (request, response) => response.json(await service.refresh(token(request.body)))));
  router.get('/me', authenticate, asyncHandler(async (request, response) => response.json(await service.me(request.user!.sub))));
  router.post('/logout', authenticate, asyncHandler(async (request, response) => { await service.logout(token(request.body),request.user!.sid,request.user!.sub); response.json({ success: true }); }));
  return router;
}
