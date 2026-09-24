import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../shared/http-error.js';
import type { AuthUser } from '../types/index.js';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '../config/database.js';
import { resolveRbacContext } from '../modules/rbac/rbac.service.js';

export async function authenticate(request: Request, _response: Response, next: NextFunction) {
  const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return next(new HttpError(401, 'Jeton manquant'));
  let user:AuthUser;
  try {
    user=jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] }) as AuthUser;
    if(!user.sid)throw new Error();
  } catch {
    return next(new HttpError(401, 'Jeton invalide ou expiré'));
  }
  try {
    const [active]=await query<RowDataPacket[]>('SELECT u.id,u.agency_id FROM users u JOIN refresh_tokens rt ON rt.id=? AND rt.user_id=u.id AND rt.revoked_at IS NULL AND rt.expires_at>NOW() WHERE u.id=? AND u.is_active=TRUE LIMIT 1',[user.sid,user.sub]);
    if(!active)throw new HttpError(401,'Compte désactivé ou introuvable');
    user.agencyId=active.agency_id==null?null:String(active.agency_id);
    request.user=user;
    request.rbac=await resolveRbacContext(user.sub);
    if(!request.rbac.roleId)throw new HttpError(403,'Rôle actif introuvable');
    next();
  }
  catch(error) { next(error); }
}
