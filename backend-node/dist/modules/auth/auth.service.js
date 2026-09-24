import argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { execute, query } from '../../config/database.js';
import { HttpError } from '../../shared/http-error.js';
import { resolveRbacContext } from '../rbac/rbac.service.js';
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
async function rolesFor(userId) {
    return (await query('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=? AND r.is_active=TRUE', [userId])).map((row) => row.code);
}
async function userProfile(user) {
    const rbac = await resolveRbacContext(String(user.id));
    if (!rbac.roleCode)
        throw new HttpError(403, 'ROLE_INACTIVE_OR_MISSING');
    return {
        id: String(user.id), firstName: user.first_name, lastName: user.last_name, email: user.email,
        agencyId: String(user.agency_id), agencyName: user.agency_name ?? '', agencyCode: user.agency_code ?? '', avatar: user.avatar_path ?? null,
        roles: [rbac.roleCode], role: { id: rbac.roleId, code: rbac.roleCode, isSystemSuperAdmin: rbac.isSuperAdmin },
        permissions: rbac.isSuperAdmin ? [{ code: '*', scope: 'GLOBAL' }] : [...rbac.permissions.entries()].map(([code, scope]) => ({ code, scope })),
    };
}
function tokensFor(user, roles, sessionId) {
    const payload = { sub: String(user.id), email: user.email, roles, agencyId: user.agency_id == null ? null : String(user.agency_id), sid: sessionId };
    const accessToken = jwt.sign(payload, env.jwt.accessSecret, { algorithm: 'HS256', expiresIn: env.jwt.accessTtl });
    const refreshToken = jwt.sign({ ...payload, jti: randomUUID(), type: 'refresh' }, env.jwt.refreshSecret, { algorithm: 'HS256', expiresIn: env.jwt.refreshTtl });
    const decoded = jwt.decode(refreshToken);
    return { accessToken, refreshToken, refreshHash: hashToken(refreshToken), refreshExpiresAt: decoded.exp ?? 0 };
}
async function issueTokens(user, roles) {
    const sessionId = randomUUID(), tokens = tokensFor(user, roles, sessionId);
    await execute('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,FROM_UNIXTIME(?))', [sessionId, user.id, tokens.refreshHash, tokens.refreshExpiresAt]);
    return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
}
export async function login(email, password) {
    const [user] = await query('SELECT u.id,u.agency_id,u.first_name,u.last_name,u.email,u.password_hash,u.is_active,u.avatar_path,a.name agency_name,a.code agency_code FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.email=? LIMIT 1', [email.trim().toLowerCase()]);
    if (!user || !user.is_active || !(await argon2.verify(user.password_hash, password)))
        throw new HttpError(401, 'Identifiants invalides');
    const roles = await rolesFor(String(user.id));
    if (!roles.length)
        throw new HttpError(403, 'ROLE_INACTIVE_OR_MISSING');
    const tokens = await issueTokens(user, roles);
    await execute('UPDATE users SET last_login_at=NOW() WHERE id=?', [user.id]);
    return { ...tokens, user: await userProfile(user) };
}
export async function refresh(refreshToken) {
    try {
        const payload = jwt.verify(refreshToken, env.jwt.refreshSecret, { algorithms: ['HS256'] });
        if (payload.type !== 'refresh' || !payload.jti)
            throw new Error();
        const sessionId = payload.sid ?? payload.jti;
        const [user] = await query('SELECT id,agency_id,first_name,last_name,email,password_hash,is_active FROM users WHERE id=? AND is_active=TRUE', [payload.sub]);
        if (!user)
            throw new Error();
        const roles = await rolesFor(String(user.id));
        if (!roles.length)
            throw new Error();
        const tokens = tokensFor(user, roles, sessionId);
        const rotated = await execute(`UPDATE refresh_tokens rt JOIN users u ON u.id=rt.user_id AND u.is_active=TRUE SET rt.token_hash=?,rt.expires_at=FROM_UNIXTIME(?) WHERE rt.id=? AND rt.user_id=? AND rt.token_hash=? AND rt.revoked_at IS NULL AND rt.expires_at>NOW()`, [tokens.refreshHash, tokens.refreshExpiresAt, sessionId, payload.sub, hashToken(refreshToken)]);
        if (!rotated.affectedRows)
            throw new Error();
        return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user: await userProfile(user) };
    }
    catch {
        throw new HttpError(401, 'Refresh token invalide');
    }
}
export async function me(userId) {
    const [user] = await query('SELECT u.id,u.agency_id,u.first_name,u.last_name,u.email,u.password_hash,u.is_active,u.avatar_path,a.name agency_name,a.code agency_code FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.id=? AND u.is_active=TRUE LIMIT 1', [userId]);
    if (!user)
        throw new HttpError(401, 'Utilisateur inactif ou introuvable');
    return { user: await userProfile(user) };
}
export async function logout(refreshToken, sessionId, userId) {
    try {
        const payload = jwt.verify(refreshToken, env.jwt.refreshSecret, { algorithms: ['HS256'], ignoreExpiration: true });
        if (payload.type !== 'refresh' || !payload.jti || payload.sid !== sessionId || payload.sub !== userId)
            throw new Error();
        await execute('UPDATE refresh_tokens SET revoked_at=COALESCE(revoked_at,NOW()) WHERE id=? AND user_id=?', [sessionId, userId]);
    }
    catch {
        throw new HttpError(401, 'Refresh token invalide');
    }
}
