import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import { HttpError } from '../../shared/http-error.js';
import { authenticate } from '../../middleware/authenticate.js';
import * as service from './auth.service.js';
export const authRouter = Router();
const credentials = (body) => {
    const value = body;
    if (typeof value?.email !== 'string' || !/^\S+@\S+\.\S+$/.test(value.email) || typeof value.password !== 'string' || value.password.length < 8)
        throw new HttpError(400, 'Email valide et mot de passe de 8 caractères minimum requis');
    return { email: value.email, password: value.password };
};
const token = (body) => {
    const value = body?.refreshToken;
    if (typeof value !== 'string' || value.length < 20)
        throw new HttpError(400, 'Refresh token requis');
    return value;
};
authRouter.post('/login', asyncHandler(async (request, response) => { const input = credentials(request.body); response.json(await service.login(input.email, input.password)); }));
authRouter.post('/refresh', asyncHandler(async (request, response) => response.json(await service.refresh(token(request.body)))));
authRouter.post('/logout', authenticate, asyncHandler(async (request, response) => { await service.logout(token(request.body)); response.json({ success: true }); }));
