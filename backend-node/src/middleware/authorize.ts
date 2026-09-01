import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../shared/http-error.js';

export const authorize = (...roles: string[]) => (request: Request, _response: Response, next: NextFunction) => {
  if (request.user?.roles.some((role) => roles.includes(role))) return next();
  next(new HttpError(403, 'Vous ne disposez pas des droits nécessaires'));
};

export const unrestricted = (request: Request) => Boolean(request.user?.roles.some((role) => ['SUPER_ADMIN', 'DIRECTOR'].includes(role)));
export const scopedAgencyId = (request: Request) => unrestricted(request) ? null : request.user?.agencyId ?? null;
