import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../shared/http-error.js';
import type { AuthUser } from '../types/index.js';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '../config/database.js';
import {resolveAgencyRbacContext} from '../modules/rbac/agency-rbac.service.js';
import { assertSessionCurrent } from '../modules/auth/two-factor.service.js';

const legacyContext=(context:Awaited<ReturnType<typeof resolveAgencyRbacContext>>)=>{const first=context.roles[0]??null,permissions=new Map<string,'OWN'|'AGENCY'|null>();for(const[code,scope]of context.permissions)permissions.set(code,scope==='OWN'?'OWN':scope==null?null:'AGENCY');return{roleId:first?.id??null,roleCode:first?.code??(context.isSuperAdmin?'SUPER_ADMIN':null),isSuperAdmin:context.isSuperAdmin,permissions}};
const isAgencyContextRecoveryRoute=(request:Request)=>request.method==='GET'&&(request.path==='/rbac/agencies'||request.path==='/rbac/agency-context')||request.method==='PUT'&&request.path==='/rbac/agency-context';

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
    const [active]=await query<RowDataPacket[]>('SELECT u.id FROM users u JOIN refresh_tokens rt ON rt.id=? AND rt.user_id=u.id AND rt.revoked_at IS NULL AND rt.expires_at>NOW() WHERE u.id=? AND u.is_active=TRUE LIMIT 1',[user.sid,user.sub]);
    if(!active)throw new HttpError(401,'Compte désactivé ou introuvable');
    await assertSessionCurrent(user.sub,user.sid);
    const agencyContext=await resolveAgencyRbacContext(user.sub,user.sid);
    user.agencyId=agencyContext.activeAgencyId;
    request.user=user;
    request.agencyRbac=agencyContext;
    request.rbac=legacyContext(agencyContext);
    // Un utilisateur dont le dernier rôle vient d'être retiré doit encore
    // pouvoir consulter ses affectations et basculer vers une autre agence.
    // Toutes les autres routes restent fermées tant qu'aucun rôle n'est actif.
    if(!agencyContext.isSuperAdmin&&!agencyContext.roles.length&&!isAgencyContextRecoveryRoute(request))throw new HttpError(403,'Rôle actif introuvable');
    next();
  }
  catch(error) { next(error); }
}
