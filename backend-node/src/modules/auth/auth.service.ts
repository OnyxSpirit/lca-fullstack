import argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import { env } from '../../config/env.js';
import { execute, query, transaction } from '../../config/database.js';
import { HttpError } from '../../shared/http-error.js';
import { resolveRbacContext } from '../rbac/rbac.service.js';
import type { Request } from 'express';
import * as twoFactor from './two-factor.service.js';

interface UserRow extends RowDataPacket { id: string; agency_id: string; agency_name?:string; agency_code?:string; avatar_path?:string|null; first_name: string; last_name: string; email: string; password_hash: string; is_active: number }
interface RoleRow extends RowDataPacket { code: string }
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function rolesFor(userId: string) {
  return (await query<RoleRow[]>('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=? AND r.is_active=TRUE', [userId])).map((row) => row.code);
}

async function userProfile(user: UserRow) {
  const rbac = await resolveRbacContext(String(user.id));
  if (!rbac.roleCode) throw new HttpError(403, 'ROLE_INACTIVE_OR_MISSING');
  return {
    id: String(user.id), firstName: user.first_name, lastName: user.last_name, email: user.email,
    agencyId: String(user.agency_id), agencyName: user.agency_name ?? '', agencyCode: user.agency_code ?? '', avatar: user.avatar_path ?? null,
    roles: [rbac.roleCode], role: { id: rbac.roleId, code: rbac.roleCode, isSystemSuperAdmin: rbac.isSuperAdmin },
    permissions: [...rbac.permissions.entries()].map(([code, scope]) => ({ code, scope })),
  };
}

function tokensFor(user: UserRow, roles: string[], sessionId: string) {
  const payload = { sub: String(user.id), email: user.email, roles, agencyId: user.agency_id == null ? null : String(user.agency_id), sid: sessionId };
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, { algorithm: 'HS256', expiresIn: env.jwt.accessTtl as SignOptions['expiresIn'] });
  const refreshToken = jwt.sign({ ...payload, jti: randomUUID(), type: 'refresh' }, env.jwt.refreshSecret, { algorithm: 'HS256', expiresIn: env.jwt.refreshTtl as SignOptions['expiresIn'] });
  const decoded = jwt.decode(refreshToken) as { exp?: number };
  return { accessToken, refreshToken, refreshHash: hashToken(refreshToken), refreshExpiresAt: decoded.exp ?? 0 };
}

async function issueTokens(user: UserRow, roles: string[],twoFactorVerified=false) {
  const sessionId = randomUUID(), tokens = tokensFor(user, roles, sessionId);
  await transaction(async connection=>{await connection.execute("INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at,two_factor_verified_at,strong_auth_at,strong_auth_method,two_factor_grandfathered) VALUES(?,?,?,FROM_UNIXTIME(?),IF(?,UTC_TIMESTAMP(),NULL),UTC_TIMESTAMP(),IF(?,'PASSWORD_TOTP','PASSWORD'),FALSE)", [sessionId, user.id, tokens.refreshHash, tokens.refreshExpiresAt,twoFactorVerified,twoFactorVerified]);await connection.execute('UPDATE users SET last_login_at=NOW() WHERE id=?',[user.id])});
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}

async function activeUser(userId:string){const[user]=await query<UserRow[]>('SELECT u.id,u.agency_id,u.first_name,u.last_name,u.email,u.password_hash,u.is_active,u.avatar_path,a.name agency_name,a.code agency_code FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.id=? AND u.is_active=TRUE LIMIT 1',[userId]);if(!user)throw new HttpError(401,'Compte indisponible.');return user}

export async function login(email: string, password: string,request:Request) {
  const [user] = await query<UserRow[]>('SELECT u.id,u.agency_id,u.first_name,u.last_name,u.email,u.password_hash,u.is_active,u.avatar_path,a.name agency_name,a.code agency_code FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.email=? LIMIT 1', [email.trim().toLowerCase()]);
  if (!user || !user.is_active || !(await argon2.verify(user.password_hash, password))) throw new HttpError(401, 'Identifiants invalides');
  const roles = await rolesFor(String(user.id));
  if (!roles.length) throw new HttpError(403, 'ROLE_INACTIVE_OR_MISSING');
  const state=await twoFactor.requirement(String(user.id));
  if(state.enabled||state.required){
    const purpose=state.enabled?'LOGIN_VERIFY':'LOGIN_SETUP',challenge=await twoFactor.createLoginChallenge(String(user.id),purpose,twoFactor.challengeFingerprint(request));
    return{status:state.enabled?'two_factor_required':'two_factor_setup_required',challengeToken:challenge.id,expiresIn:challenge.expiresIn};
  }
  const profile=await userProfile(user);
  const tokens = await issueTokens(user, roles);
  return { status:'authenticated',...tokens, user: profile };
}

async function complete(userId:string,recoveryCodes?:string[]){const user=await activeUser(userId),roles=await rolesFor(userId);if(!roles.length)throw new HttpError(403,'ROLE_INACTIVE_OR_MISSING');return{status:'authenticated',...await issueTokens(user,roles,true),user:await userProfile(user),...(recoveryCodes?{recoveryCodes}:{})}}
export async function verifyTwoFactor(challengeToken:string,token:unknown,request:Request){const userId=await twoFactor.verifyLoginChallenge(challengeToken,twoFactor.challengeFingerprint(request),token,request);return complete(userId)}
export async function recoverTwoFactor(challengeToken:string,recoveryCode:unknown,request:Request){const userId=await twoFactor.recoverLoginChallenge(challengeToken,twoFactor.challengeFingerprint(request),recoveryCode,request);return complete(userId)}
export async function setupForChallenge(challengeToken:string,request:Request){return twoFactor.beginChallengeSetup(challengeToken,twoFactor.challengeFingerprint(request))}
export async function confirmChallengeSetup(challengeToken:string,token:unknown,request:Request){const result=await twoFactor.confirmChallengeSetup(challengeToken,twoFactor.challengeFingerprint(request),token,request);return complete(result.userId,result.recoveryCodes)}

export async function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.jwt.refreshSecret, { algorithms: ['HS256'] }) as { sub: string; jti: string; sid?: string; type: string };
    if (payload.type !== 'refresh' || !payload.jti) throw new Error();
    const sessionId=payload.sid??payload.jti;
    const [user] = await query<UserRow[]>('SELECT id,agency_id,first_name,last_name,email,password_hash,is_active FROM users WHERE id=? AND is_active=TRUE', [payload.sub]);
    if (!user) throw new Error();
    const roles = await rolesFor(String(user.id));
    if (!roles.length) throw new Error();
    await twoFactor.assertSessionCurrent(String(user.id),sessionId);
    const tokens = tokensFor(user, roles, sessionId);
    const rotated = await execute(`UPDATE refresh_tokens rt JOIN users u ON u.id=rt.user_id AND u.is_active=TRUE SET rt.token_hash=?,rt.expires_at=FROM_UNIXTIME(?) WHERE rt.id=? AND rt.user_id=? AND rt.token_hash=? AND rt.revoked_at IS NULL AND rt.expires_at>NOW()`, [tokens.refreshHash, tokens.refreshExpiresAt, sessionId, payload.sub, hashToken(refreshToken)]);
    if (!rotated.affectedRows) throw new Error();
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: await userProfile(user) };
  } catch { throw new HttpError(401, 'Refresh token invalide'); }
}

export async function me(userId: string) {
  const [user] = await query<UserRow[]>('SELECT u.id,u.agency_id,u.first_name,u.last_name,u.email,u.password_hash,u.is_active,u.avatar_path,a.name agency_name,a.code agency_code FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.id=? AND u.is_active=TRUE LIMIT 1', [userId]);
  if (!user) throw new HttpError(401, 'Utilisateur inactif ou introuvable');
  return { user: await userProfile(user) };
}

export async function logout(refreshToken: string, sessionId: string, userId: string) {
  try {
    const payload=jwt.verify(refreshToken,env.jwt.refreshSecret,{algorithms:['HS256'],ignoreExpiration:true}) as {sub:string;jti:string;sid:string;type:string};
    if(payload.type!=='refresh'||!payload.jti||payload.sid!==sessionId||payload.sub!==userId)throw new Error();
    await execute('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,NOW()) WHERE id=? AND user_id=?',[sessionId,userId]);
  } catch { throw new HttpError(401,'Refresh token invalide'); }
}
