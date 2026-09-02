import { HttpError } from '../shared/http-error.js';
export const notFound = (request, _response, next) => next(new HttpError(404, `Route introuvable: ${request.method} ${request.originalUrl}`));
export const errorHandler = (error, _request, response, _next) => {
    const duplicate = error.code === 'ER_DUP_ENTRY';
    const status = error instanceof HttpError ? error.status : duplicate ? 409 : 500;
    const message = error instanceof HttpError ? error.message : duplicate ? 'Cette ressource existe déjà' : 'Erreur interne du serveur';
    if (status >= 500)
        console.error(error);
    response.status(status).json({ statusCode: status, message, ...(error instanceof HttpError && error.details ? { details: error.details } : {}) });
};
export const asyncHandler = (handler) => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
