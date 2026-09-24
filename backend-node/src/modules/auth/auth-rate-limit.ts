import { createHash } from 'node:crypto';
import type { Request, RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

export interface AuthRateLimitConfig {
  loginWindowMs: number;
  loginMax: number;
  loginIpMax: number;
  refreshWindowMs: number;
  refreshMax: number;
}

const responseBody = { statusCode: 429, code: 'AUTH_RATE_LIMITED', message: 'Trop de tentatives. Réessayez plus tard.' } as const;
const clientIp = (request: Request) => ipKeyGenerator(request.ip || request.socket.remoteAddress || 'unknown');
const loginIdentity = (request: Request) => {
  const raw = (request.body as { email?: unknown } | undefined)?.email;
  const normalized = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return createHash('sha256').update(normalized || 'missing').digest('hex');
};

function limiter(windowMs: number, max: number, keyGenerator?: (request: Request) => string): RequestHandler {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Le proxy est validé par la topologie explicite de l'application. En accès
    // direct (0 saut), un XFF hostile est volontairement ignoré, pas considéré
    // comme une erreur de configuration par la bibliothèque.
    validate: { xForwardedForHeader: false },
    keyGenerator,
    handler: (_request, response) => response.status(429).json(responseBody),
  });
}

export function createAuthRateLimiters(config: AuthRateLimitConfig) {
  return {
    login: [
      limiter(config.loginWindowMs, config.loginIpMax, clientIp),
      limiter(config.loginWindowMs, config.loginMax, (request) => `${clientIp(request)}:${loginIdentity(request)}`),
    ],
    refresh: limiter(config.refreshWindowMs, config.refreshMax, clientIp),
  };
}
