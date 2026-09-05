import argon2 from 'argon2';
import { createHash, randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { execute, query } from '../../config/database.js';
import { HttpError } from '../../shared/http-error.js';
const hashToken = (token) => createHash('sha256').update(token).digest('hex');
async function rolesFor(userId) {
    return (await query('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=?', [userId])).map((row) => row.code);
}
async function issueTokens(user, roles) {
    const payload = { sub: String(user.id), email: user.email, roles, agencyId: user.agency_id == null ? null : String(user.agency_id) };
    const accessToken = jwt.sign(payload, env.jwt.accessSecret, { expiresIn: env.jwt.accessTtl });
    const tokenId = randomUUID();
    const refreshToken = jwt.sign({ ...payload, jti: tokenId, type: 'refresh' }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshTtl });
    const decoded = jwt.decode(refreshToken);
    await execute('INSERT INTO refresh_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,FROM_UNIXTIME(?))', [tokenId, user.id, hashToken(refreshToken), decoded.exp ?? 0]);
    return { accessToken, refreshToken };
}
export async function login(email, password) {
    const [user] = await query('SELECT u.id,u.agency_id,u.first_name,u.last_name,u.email,u.password_hash,u.is_active,u.avatar_path,a.name agency_name,a.code agency_code FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.email=? LIMIT 1', [email.trim().toLowerCase()]);
    if (!user || !user.is_active || !(await argon2.verify(user.password_hash, password)))
        throw new HttpError(401, 'Identifiants invalides');
    const roles = await rolesFor(String(user.id));
    const tokens = await issueTokens(user, roles);
    await execute('UPDATE users SET last_login_at=NOW() WHERE id=?', [user.id]);
    return { ...tokens, user: { id: String(user.id), firstName: user.first_name, lastName: user.last_name, email: user.email, agencyId: String(user.agency_id), agencyName: user.agency_name, agencyCode: user.agency_code, avatar: user.avatar_path ?? null, roles } };
}
export async function refresh(refreshToken) {
    try {
        const payload = jwt.verify(refreshToken, env.jwt.refreshSecret);
        if (payload.type !== 'refresh')
            throw new Error();
        const revoked = await execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=? AND token_hash=? AND revoked_at IS NULL AND expires_at>NOW()', [payload.jti, hashToken(refreshToken)]);
        if (!revoked.affectedRows)
            throw new Error();
        const [user] = await query('SELECT id,agency_id,first_name,last_name,email,password_hash,is_active FROM users WHERE id=? AND is_active=TRUE', [payload.sub]);
        if (!user)
            throw new Error();
        return issueTokens(user, await rolesFor(String(user.id)));
    }
    catch {
        throw new HttpError(401, 'Refresh token invalide');
    }
}
export async function logout(refreshToken) {
    await execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=? AND revoked_at IS NULL', [hashToken(refreshToken)]);
}
