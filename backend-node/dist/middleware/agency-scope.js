import { HttpError } from '../shared/http-error.js';
import { unrestricted } from './authorize.js';
export function enforceAgencyScope(request, _response, next) {
    if (unrestricted(request))
        return next();
    // Les routes Users appliquent le scope de chaque permission (OWN/AGENCY/
    // CONCESSION/GLOBAL) à l'agence persistée de la cible.
    if (request.path === '/users' || request.path.startsWith('/users/') || request.path === '/hr' || request.path.startsWith('/hr/'))
        return next();
    const body = request.body;
    const requested = body?.agencyId ?? body?.agency_id ?? request.query.agencyId ?? request.query.agency_id;
    if (requested != null && String(requested) !== String(request.user?.agencyId))
        return next(new HttpError(403, 'Cette opération appartient à une autre agence'));
    next();
}
