import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { mock, test } from 'node:test';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { env } from '../src/config/env.js';

type Session = { id: string; userId: string; hash: string; expires: number; revoked: boolean };
const password = 'valid-password';
const user = { id: '1', agency_id: '10', agency_name: 'Agence', agency_code: 'AG', avatar_path: null, first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.test', password_hash: await argon2.hash(password), is_active: 1 };
const sessions = new Map<string, Session>();
let permissionEnabled = true;
const result = (affectedRows = 1): ResultSetHeader => ({ affectedRows } as ResultSetHeader);

async function query<T extends RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T> {
  if (sql.includes('FROM roles r JOIN user_roles')) return [{ code: 'EMPLOYEE' }] as T;
  if (sql.includes('FROM users u JOIN agencies') && sql.includes('u.email=?')) return (user.is_active && params[0] === user.email ? [user] : []) as T;
  if (sql.includes('FROM users u JOIN agencies') && sql.includes('u.id=?')) return (user.is_active && params[0] === user.id ? [user] : []) as T;
  if (sql.includes('FROM users WHERE id=? AND is_active=TRUE')) return (user.is_active && params[0] === user.id ? [user] : []) as T;
  if (sql.includes('JOIN refresh_tokens rt')) {
    const session = sessions.get(String(params[0]));
    return (user.is_active && params[1] === user.id && session && session.userId === user.id && !session.revoked && session.expires * 1000 > Date.now() ? [user] : []) as T;
  }
  throw new Error(`Requête de test non gérée: ${sql}`);
}

async function execute(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  if (sql.startsWith('INSERT INTO refresh_tokens')) {
    sessions.set(String(params[0]), { id: String(params[0]), userId: String(params[1]), hash: String(params[2]), expires: Number(params[3]), revoked: false });
    return result();
  }
  if (sql.startsWith('UPDATE users SET last_login_at')) return result();
  if (sql.startsWith('UPDATE refresh_tokens rt JOIN users')) {
    const session = sessions.get(String(params[2]));
    if (!user.is_active || !session || session.userId !== String(params[3]) || session.hash !== String(params[4]) || session.revoked || session.expires * 1000 <= Date.now()) return result(0);
    session.hash = String(params[0]); session.expires = Number(params[1]); return result();
  }
  if (sql.startsWith('UPDATE refresh_tokens SET revoked_at=COALESCE')) {
    const session = sessions.get(String(params[0]));
    if (session?.userId === String(params[1])) session.revoked = true;
    return result(session ? 1 : 0);
  }
  throw new Error(`Écriture de test non gérée: ${sql}`);
}

mock.module('../src/config/database.js', { namedExports: { query, execute } });
mock.module('../src/modules/rbac/rbac.service.js', { namedExports: {
  resolveRbacContext: async () => ({ roleId: '1', roleCode: 'EMPLOYEE', isSuperAdmin: false, permissions: new Map(permissionEnabled ? [['documents.view', 'AGENCY']] : []) }),
} });

const service = await import('../src/modules/auth/auth.service.js');
const { authenticate } = await import('../src/middleware/authenticate.js');

const claims = (token: string) => jwt.verify(token, env.jwt.accessSecret, { algorithms: ['HS256'] }) as { sub: string; sid: string };
async function authenticated(accessToken: string) {
  const request = { headers: { authorization: `Bearer ${accessToken}` } } as any;
  let outcome: unknown;
  await authenticate(request, {} as any, (value?: unknown) => { outcome = value ?? request; });
  return outcome as any;
}

test('L1-L12/L17: logout révoque seulement la session A et la rotation conserve la session B', async () => {
  const a = await service.login(user.email, password), b = await service.login(user.email, password);
  const aClaims = claims(a.accessToken), bClaims = claims(b.accessToken);
  assert.notEqual(aClaims.sid, bClaims.sid);
  assert.equal((await authenticated(a.accessToken)).user.sub, user.id);
  await service.logout(a.refreshToken, aClaims.sid, user.id);
  assert.equal((await authenticated(a.accessToken)).status, 401);
  await assert.rejects(service.refresh(a.refreshToken), (error: any) => error.status === 401);
  assert.equal((await authenticated(b.accessToken)).user.sub, user.id);
  const rotated = await service.refresh(b.refreshToken);
  assert.equal(claims(rotated.accessToken).sid, bClaims.sid);
  assert.notEqual(rotated.refreshToken, b.refreshToken);
  assert.equal((await authenticated(rotated.accessToken)).user.sub, user.id);
  await service.logout(a.refreshToken, aClaims.sid, user.id);
  assert.equal(sessions.get(bClaims.sid)?.revoked, false);
});

test('L13-L14: utilisateur désactivé et permissions retirées sont relus à chaque requête', async () => {
  const session = await service.login(user.email, password);
  permissionEnabled = true;
  assert.equal((await authenticated(session.accessToken)).rbac.permissions.has('documents.view'), true);
  permissionEnabled = false;
  assert.equal((await authenticated(session.accessToken)).rbac.permissions.has('documents.view'), false);
  user.is_active = 0;
  assert.equal((await authenticated(session.accessToken)).status, 401);
  user.is_active = 1;
});

test('LC2-LC4: tous les ordres refresh/logout finissent révoqués sans affecter B', async () => {
  const a = await service.login(user.email, password), b = await service.login(user.email, password), sidA = claims(a.accessToken).sid, sidB = claims(b.accessToken).sid;
  const refreshFirst = await service.refresh(a.refreshToken);
  await service.logout(a.refreshToken, sidA, user.id);
  assert.equal((await authenticated(refreshFirst.accessToken)).status, 401);
  assert.equal((await authenticated(b.accessToken)).user.sub, user.id);

  const c = await service.login(user.email, password), sidC = claims(c.accessToken).sid;
  await service.logout(c.refreshToken, sidC, user.id);
  await assert.rejects(service.refresh(c.refreshToken), (error: any) => error.status === 401);
  await Promise.all([service.logout(c.refreshToken, sidC, user.id), service.logout(c.refreshToken, sidC, user.id)]);
  assert.equal(sessions.get(sidC)?.revoked, true);
  assert.equal(sessions.get(sidB)?.revoked, false);
});

test('LC1: la frontière est la vérification middleware, une requête déjà admise peut finir', async () => {
  const session = await service.login(user.email, password), sid = claims(session.accessToken).sid;
  const admitted = await authenticated(session.accessToken);
  assert.equal(admitted.user.sub, user.id);
  await service.logout(session.refreshToken, sid, user.id);
  assert.equal(admitted.user.sub, user.id);
  assert.equal((await authenticated(session.accessToken)).status, 401);
});

test('L15-L16/L18: downloads et nouvelles sockets passent par la session, sans fuite sensible', () => {
  const app = readFileSync(new URL('../src/app.ts', import.meta.url), 'utf8');
  const realtime = readFileSync(new URL('../src/realtime/socket.ts', import.meta.url), 'utf8');
  const auth = readFileSync(new URL('../src/middleware/authenticate.ts', import.meta.url), 'utf8');
  const delivery = readFileSync(new URL('../src/modules/deliveries/delivery.routes.ts', import.meta.url), 'utf8');
  assert.match(app, /app\.use\('\/api',authenticate/);
  assert.match(delivery, /documents\/:documentId\/download/);
  assert.match(realtime, /JOIN refresh_tokens rt/);
  assert.match(auth, /JOIN refresh_tokens rt/);
  assert.doesNotMatch(auth + realtime, /console\.|token_hash/);
});

test('JWT: HS256 est explicite et les anciens access tokens sans sid sont refusés', async () => {
  const legacy = jwt.sign({ sub: user.id, email: user.email, roles: ['EMPLOYEE'], agencyId: user.agency_id }, env.jwt.accessSecret, { algorithm: 'HS256', expiresIn: '5m' });
  assert.equal((await authenticated(legacy)).status, 401);
  const legacySession = randomUUID();
  const legacyRefresh = jwt.sign({ sub: user.id, email: user.email, roles: ['EMPLOYEE'], agencyId: user.agency_id, jti: legacySession, type: 'refresh' }, env.jwt.refreshSecret, { algorithm: 'HS256', expiresIn: '5m' });
  sessions.set(legacySession, { id: legacySession, userId: user.id, hash: createHash('sha256').update(legacyRefresh).digest('hex'), expires: Math.floor(Date.now() / 1000) + 300, revoked: false });
  const upgraded = await service.refresh(legacyRefresh);
  assert.equal(claims(upgraded.accessToken).sid, legacySession);
});
