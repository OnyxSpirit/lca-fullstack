import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../shared/http-error.js';
import type { AuthUser } from '../types/index.js';

export function authenticate(request: Request, _response: Response, next: NextFunction) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return next(new HttpError(401, 'Jeton manquant'));
  try { request.user=jwt.verify(token, env.jwt.accessSecret) as AuthUser;next(); }
  catch { next(new HttpError(401, 'Jeton invalide ou expiré')); }
}
