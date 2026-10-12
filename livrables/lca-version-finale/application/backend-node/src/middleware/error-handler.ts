import type { ErrorRequestHandler, RequestHandler } from 'express';
import { HttpError } from '../shared/http-error.js';
import {CUSTOMER_IDENTITY_CONFLICT_MESSAGE,isCustomerIdentityDuplicate} from '../modules/customers/customer-identity.js';

export const notFound: RequestHandler = (request, _response, next) => next(new HttpError(404, `Route introuvable: ${request.method} ${request.originalUrl}`));

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  const mysql=error as {code?:string;errno?:number;sqlState?:string};
  const duplicate = mysql.code === 'ER_DUP_ENTRY';
  const duplicateVin = duplicate && request.method === 'POST' && /^\/api\/vehicles\/?$/.test(request.path);
  const duplicateCustomerIdentity=isCustomerIdentityDuplicate(error);
  const status = error instanceof HttpError ? error.status : duplicateVin||duplicateCustomerIdentity ? 409 : 500;
  const message = error instanceof HttpError ? error.message : duplicateVin ? 'Un véhicule portant ce VIN existe déjà.' : duplicateCustomerIdentity ? CUSTOMER_IDENTITY_CONFLICT_MESSAGE : 'Erreur interne du serveur';
  if (status >= 500) console.error({
    method: request.method,
    route: request.originalUrl,
    code: mysql.code,
    errno: mysql.errno,
    sqlState: mysql.sqlState,
    message: error instanceof Error ? error.message : String(error),
    stack: process.env.NODE_ENV === 'production' ? undefined : error instanceof Error ? error.stack : undefined,
  });
  response.status(status).json({ statusCode: status, message, ...(duplicateVin ? { code: 'VIN_ALREADY_EXISTS' } : {}), ...(error instanceof HttpError && error.details ? { details: error.details } : {}) });
};

export const asyncHandler = (handler: RequestHandler): RequestHandler => (request, response, next) => Promise.resolve(handler(request, response, next)).catch(next);
