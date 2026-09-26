import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../shared/http-error.js';
import { unrestricted } from './authorize.js';

export function enforceAgencyScope(request: Request, _response: Response, next: NextFunction) {
  if (unrestricted(request)) return next();
  // Les routes Users appliquent le scope de chaque permission (OWN/AGENCY/
  // CONCESSION/GLOBAL) à l'agence persistée de la cible.
  // Users, RH, Showroom et Véhicules valident l'agence cible avec le scope de la
  // permission métier réellement exercée. Le filtre générique ne connaît pas
  // cette permission et réduirait à tort CONCESSION/GLOBAL à l'agence acteur.
  if(request.path==='/users'||request.path.startsWith('/users/')||request.path==='/hr'||request.path.startsWith('/hr/')||request.path==='/showroom'||request.path.startsWith('/showroom/')||request.path==='/vehicles'||request.path.startsWith('/vehicles/'))return next();
  const body = request.body as Record<string, unknown> | undefined;
  const requested = body?.agencyId ?? body?.agency_id ?? request.query.agencyId ?? request.query.agency_id;
  if (requested != null && String(requested) !== String(request.user?.agencyId)) return next(new HttpError(403, 'Cette opération appartient à une autre agence'));
  next();
}
