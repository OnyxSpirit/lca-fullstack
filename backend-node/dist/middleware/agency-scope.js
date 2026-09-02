import { HttpError } from '../shared/http-error.js';
import { unrestricted } from './authorize.js';
export function enforceAgencyScope(request, _response, next) {
    if (unrestricted(request))
        return next();
    const body = request.body;
    const requested = body?.agencyId ?? body?.agency_id ?? request.query.agencyId ?? request.query.agency_id;
    if (requested != null && String(requested) !== String(request.user?.agencyId))
        return next(new HttpError(403, 'Cette opération appartient à une autre agence'));
    next();
}
