import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../shared/http-error.js';

export const notFound: RequestHandler = (request, _response, next) => next(new HttpError(404, `Route introuvable: ${request.method} ${request.originalUrl}`));

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const duplicate = (error as { code?: string }).code === 'ER_DUP_ENTRY';
  const status = error instanceof HttpError ? error.status : duplicate ? 409 : 500;
  const message = error instanceof HttpError ? error.message : duplicate ? 'Cette ressource existe déjà' : 'Erreur interne du serveur';
  if (status >= 500) console.error({
    method: request.method,
    route: request.originalUrl,
    code: (error as { code?: string }).code,
    message: error instanceof Error ? error.message : String(error),
    stack: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.stack : undefined,
  });
  response.status(status).json({ statusCode: status, message, ...(error instanceof HttpError && error.details ? { details: error.details } : {}) });
};

export const asyncHandler = (handler: RequestHandler): RequestHandler => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
