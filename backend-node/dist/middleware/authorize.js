import { HttpError } from '../shared/http-error.js';
export const authorize = (...roles) => (request, _response, next) => {
    if (request.user?.roles.some((role) => roles.includes(role)))
        return next();
    next(new HttpError(403, 'Vous ne disposez pas des droits nécessaires'));
};
