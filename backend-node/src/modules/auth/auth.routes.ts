import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
import { authenticate } from '../../middleware/authenticate.js';
import * as service from './auth.service.js';
import { env } from '../../config/env.js';
import { createAuthRateLimiters, type AuthRateLimitConfig } from './auth-rate-limit.js';
import { requirePermission } from '../../middleware/require-permission.js';
import * as twoFactor from './two-factor.service.js';

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
const challenge=(body:unknown)=>{const value=String((body as {challengeToken?:unknown})?.challengeToken??'');if(!/^[0-9a-f-]{36}$/i.test(value))throw new HttpError(400,'Challenge 2FA requis');return value};

export function createAuthRouter(rateLimitConfig: AuthRateLimitConfig = env.authRateLimit) {
  const router = Router();
  const limits = createAuthRateLimiters(rateLimitConfig);
  router.post('/login', ...limits.login, asyncHandler(async (request, response) => { const input=credentials(request.body); response.json(await service.login(input.email,input.password,request)); }));
  router.post('/2fa/verify',...limits.login,asyncHandler(async(request,response)=>response.json(await service.verifyTwoFactor(challenge(request.body),(request.body as {code?:unknown}).code,request))));
  router.post('/2fa/recovery',...limits.login,asyncHandler(async(request,response)=>response.json(await service.recoverTwoFactor(challenge(request.body),(request.body as {recoveryCode?:unknown}).recoveryCode,request))));
  router.post('/2fa/challenge/setup',...limits.login,asyncHandler(async(request,response)=>response.json(await service.setupForChallenge(challenge(request.body),request))));
  router.post('/2fa/challenge/confirm',...limits.login,asyncHandler(async(request,response)=>response.json(await service.confirmChallengeSetup(challenge(request.body),(request.body as {code?:unknown}).code,request))));
  router.post('/2fa/step-up',authenticate,limits.stepUp,asyncHandler(async(request,response)=>response.json(await twoFactor.stepUp(request,request.body?.currentPassword,request.body?.totpCode))));
  router.get('/2fa/status',authenticate,requirePermission('auth.2fa.view'),asyncHandler(async(request,response)=>response.json(await twoFactor.status(request.user!.sub))));
  router.post('/2fa/setup',authenticate,requirePermission('auth.2fa.manage'),asyncHandler(async(request,response)=>response.json(await twoFactor.beginPersonalSetup(request))));
  router.post('/2fa/confirm',authenticate,requirePermission('auth.2fa.manage'),asyncHandler(async(request,response)=>response.json(await twoFactor.confirmPersonalSetup(request,(request.body as {code?:unknown}).code))));
  router.post('/2fa/disable',authenticate,requirePermission('auth.2fa.manage'),asyncHandler(async(request,response)=>response.json(await twoFactor.disable(request,(request.body as {code?:unknown}).code))));
  router.post('/2fa/recovery/regenerate',authenticate,requirePermission('auth.2fa.manage'),asyncHandler(async(request,response)=>response.json(await twoFactor.regenerateRecovery(request,(request.body as {code?:unknown}).code))));
  router.post('/refresh', limits.refresh, asyncHandler(async (request, response) => response.json(await service.refresh(token(request.body)))));
  router.get('/me', authenticate, asyncHandler(async (request, response) => response.json(await service.me(request.user!.sub))));
  router.post('/logout', authenticate, asyncHandler(async (request, response) => { await service.logout(token(request.body),request.user!.sid,request.user!.sub); response.json({ success: true }); }));
  return router;
}
