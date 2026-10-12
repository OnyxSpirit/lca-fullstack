import type { NextFunction, Request, Response } from 'express';
export function enforceAgencyScope(request: Request, _response: Response, next: NextFunction) {
  // L'agence cible est validée dans chaque route avec la permission réellement
  // exercée. Un filtre générique ne peut pas distinguer OWN, AGENCY,
  // CONCESSION et GLOBAL et réduisait à tort tous les scopes à AGENCY.
  void request;
  next();
}
