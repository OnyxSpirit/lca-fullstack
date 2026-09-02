import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../shared/http-error.js';
export function authenticate(request, _response, next) {
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token)
        return next(new HttpError(401, 'Jeton manquant'));
    try {
        request.user = jwt.verify(token, env.jwt.accessSecret);
        next();
    }
    catch {
        next(new HttpError(401, 'Jeton invalide ou expiré'));
    }
}
