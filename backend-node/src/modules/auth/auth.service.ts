import argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import { env } from '../../config/env.js';
import { execute, query } from '../../config/database.js';
import { HttpError } from '../../shared/http-error.js';
import { resolveRbacContext } from '../rbac/rbac.service.js';

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
    permissions: rbac.isSuperAdmin ? [{ code: '*', scope: 'GLOBAL' }] : [...rbac.permissions.entries()].map(([code, scope]) => ({ code, scope })),
  };
}

async function issueTokens(user: UserRow, roles: string[]) {
  const payload = { sub: String(user.id), email: user.email, roles, agencyId: user.agency_id == null ? null : String(user.agency_id) };
  const accessToken = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl as SignOptions['expiresIn'] });
  const tokenId = randomUUID();
  const refreshToken = jwt.sign({ ...payload, jti: tokenId, type: 'refresh' }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl as SignOptions['expiresIn'] });
  const decoded = jwt.decode(refreshToken) as { exp?: number };
  await execute('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,FROM_UNIXTIME(?))', [tokenId, user.id, hashToken(refreshToken), decoded.exp ?? 0]);
  return { accessToken, refreshToken };
}

export async function login(email: string, password: string) {
  const [user] = await query<UserRow[]>('SELECT u.id,u.agency_id,u.first_name,u.last_name,u.email,u.password_hash,u.is_active,u.avatar_path,a.name agency_name,a.code agency_code FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.email=? LIMIT 1', [email.trim().toLowerCase()]);
  if (!user || !user.is_active || !(await argon2.verify(user.password_hash, password))) throw new HttpError(401, 'Identifiants invalides');
  const roles = await rolesFor(String(user.id));
  if (!roles.length) throw new HttpError(403, 'ROLE_INACTIVE_OR_MISSING');
  const tokens = await issueTokens(user, roles);
  await execute('UPDATE users SET last_login_at=NOW() WHERE id=?', [user.id]);
  return { ...tokens, user: await userProfile(user) };
}

export async function refresh(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, env.jwt.refreshSecret) as { sub: string; jti: string; type: string };
    if (payload.type !== 'refresh') throw new Error();
    const revoked = await execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=? AND token_hash=? AND revoked_at IS NULL AND expires_at>NOW()', [payload.jti, hashToken(refreshToken)]);
    if (!revoked.affectedRows) throw new Error();
    const [user] = await query<UserRow[]>('SELECT id,agency_id,first_name,last_name,email,password_hash,is_active FROM users WHERE id=? AND is_active=TRUE', [payload.sub]);
    if (!user) throw new Error();
    const roles = await rolesFor(String(user.id));
    if (!roles.length) throw new Error();
    return { ...(await issueTokens(user, roles)), user: await userProfile(user) };
  } catch { throw new HttpError(401, 'Refresh token invalide'); }
}

export async function me(userId: string) {
  const [user] = await query<UserRow[]>('SELECT u.id,u.agency_id,u.first_name,u.last_name,u.email,u.password_hash,u.is_active,u.avatar_path,a.name agency_name,a.code agency_code FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.id=? AND u.is_active=TRUE LIMIT 1', [userId]);
  if (!user) throw new HttpError(401, 'Utilisateur inactif ou introuvable');
  return { user: await userProfile(user) };
}

export async function logout(refreshToken: string) {
  await execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=? AND revoked_at IS NULL', [hashToken(refreshToken)]);
}
