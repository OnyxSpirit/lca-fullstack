import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../shared/http-error.js';
import { query } from '../config/database.js';
import { resolveRbacContext } from '../modules/rbac/rbac.service.js';
export async function authenticate(request, _response, next) {
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token)
        return next(new HttpError(401, 'Jeton manquant'));
    let user;
    try {
        user = jwt.verify(token, env.jwt.accessSecret);
    }
    catch {
        return next(new HttpError(401, 'Jeton invalide ou expiré'));
    }
    try {
        const [active] = await query('SELECT id,agency_id FROM users WHERE id=? AND is_active=TRUE LIMIT 1', [user.sub]);
        if (!active)
            throw new HttpError(401, 'Compte désactivé ou introuvable');
        user.agencyId = active.agency_id == null ? null : String(active.agency_id);
        request.user = user;
        request.rbac = await resolveRbacContext(user.sub);
        if (!request.rbac.roleId)
            throw new HttpError(403, 'Rôle actif introuvable');
        next();
    }
    catch (error) {
        next(error);
    }
}
