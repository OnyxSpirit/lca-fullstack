import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import express from 'express';
import request from 'supertest';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { createAuthRateLimiters, type AuthRateLimitConfig } from '../src/modules/auth/auth-rate-limit.js';

const config = (overrides: Partial<AuthRateLimitConfig> = {}): AuthRateLimitConfig => ({
  loginWindowMs: 60_000, loginMax: 2, loginIpMax: 20,
  refreshWindowMs: 60_000, refreshMax: 2, ...overrides,
});
const authApp = (value = config()) => {
  const app = express(); app.set('trust proxy', 0); app.use(express.json()); app.use('/api/auth', createAuthRouter(value)); return app;
};
const invalidLogin = (app: express.Express, email = 'nobody@example.test') => request(app).post('/api/auth/login').send({ email, password: 'short' });
const invalidRefresh = (app: express.Express) => request(app).post('/api/auth/refresh').send({ refreshToken: 'short' });

test('RL1-RL4 login: passage sous seuil, blocage exact, JSON 429 et en-têtes standards', async () => {
  const app = authApp();
  assert.equal((await invalidLogin(app)).status, 400);
  assert.equal((await invalidLogin(app)).status, 400);
  const blocked = await invalidLogin(app);
  assert.equal(blocked.status, 429);
  assert.deepEqual(blocked.body, { statusCode: 429, code: 'AUTH_RATE_LIMITED', message: 'Trop de tentatives. Réessayez plus tard.' });
  assert.ok(blocked.headers.ratelimit);
  assert.ok(blocked.headers['retry-after']);
  assert.equal(blocked.headers['x-ratelimit-limit'], undefined);
});

test('RL5 login: la casse et les espaces ne permettent pas de changer de bucket', async () => {
  const app = authApp();
  await invalidLogin(app, ' User@Example.test ');
  await invalidLogin(app, 'user@example.test');
  assert.equal((await invalidLogin(app, 'USER@EXAMPLE.TEST')).status, 429);
});

test('RL6 login: deux identifiants derrière le même NAT ont des petits quotas indépendants', async () => {
  const app = authApp();
  await invalidLogin(app, 'a@example.test'); await invalidLogin(app, 'a@example.test');
  assert.equal((await invalidLogin(app, 'b@example.test')).status, 400);
});

test('RL7 login: le plafond IP bloque la rotation massive des identifiants', async () => {
  const app = authApp(config({ loginMax: 10, loginIpMax: 2 }));
  await invalidLogin(app, 'a@example.test'); await invalidLogin(app, 'b@example.test');
  assert.equal((await invalidLogin(app, 'c@example.test')).status, 429);
});

test('RL8-RL11 refresh: quota séparé, 429 JSON et en-têtes', async () => {
  const app = authApp();
  assert.equal((await invalidRefresh(app)).status, 400);
  assert.equal((await invalidRefresh(app)).status, 400);
  const blocked = await invalidRefresh(app);
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'AUTH_RATE_LIMITED');
  assert.ok(blocked.headers.ratelimit);
  assert.ok(blocked.headers['retry-after']);
  assert.equal((await invalidLogin(app, 'separate@example.test')).status, 400);
});

test('RL12-RL14: expiration de fenêtre et stores indépendants après redémarrage', async () => {
  const short = config({ loginWindowMs: 50, loginMax: 1 });
  const first = authApp(short);
  await invalidLogin(first);
  assert.equal((await invalidLogin(first)).status, 429);
  await new Promise((resolve) => setTimeout(resolve, 70));
  assert.equal((await invalidLogin(first)).status, 400);
  assert.equal((await invalidLogin(authApp(short))).status, 400);
});

test('RL15-RL18: me/logout et les autres routes ne reçoivent aucun quota auth', async () => {
  const app = authApp(config({ loginMax: 1, refreshMax: 1 }));
  for (let index = 0; index < 4; index++) {
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).post('/api/auth/logout').send({ refreshToken: '12345678901234567890' })).status, 401);
  }
  assert.equal((await invalidLogin(app)).status, 400);
  assert.equal((await invalidRefresh(app)).status, 400);
});

test('RL13/RL17/RL18: rotation, utilisateur actif et absence de journalisation sensible sont préservés', () => {
  const service = readFileSync(new URL('../src/modules/auth/auth.service.ts', import.meta.url), 'utf8');
  const limiter = readFileSync(new URL('../src/modules/auth/auth-rate-limit.ts', import.meta.url), 'utf8');
  assert.match(service, /UPDATE refresh_tokens rt JOIN users u[\s\S]*rt\.token_hash=\?[\s\S]*rt\.revoked_at IS NULL AND rt\.expires_at>NOW\(\)/);
  assert.match(service, /WHERE id=\? AND is_active=TRUE/);
  assert.match(service, /Identifiants invalides/);
  assert.doesNotMatch(limiter, /console\.|password|refreshToken|token_hash/);
  assert.doesNotMatch(JSON.stringify({ statusCode: 429, code: 'AUTH_RATE_LIMITED', message: 'Trop de tentatives. Réessayez plus tard.' }), /email|password|token/i);
});

function proxyApp(hops: number, max = 1) {
  const app = express(); app.set('trust proxy', hops); app.use(express.json());
  const limits = createAuthRateLimiters(config({ loginMax: max, loginIpMax: 100 }));
  app.post('/login', ...limits.login, (req, res) => res.json({ ip: req.ip }));
  return app;
}

test('P1-P2 accès direct: XFF forgé est ignoré et ne permet pas de tourner la clé', async () => {
  const app = proxyApp(0);
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '198.51.100.1').send({ email: 'x@example.test' })).status, 200);
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '203.0.113.2').send({ email: 'x@example.test' })).status, 429);
});

test('P3-P5 un proxy: la valeur ajoutée la plus à droite est la clé client', async () => {
  const app = proxyApp(1);
  const first = await request(app).post('/login').set('X-Forwarded-For', '192.0.2.200, 198.51.100.10').send({ email: 'x@example.test' });
  assert.equal(first.body.ip, '198.51.100.10');
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '203.0.113.99, 198.51.100.10').send({ email: 'x@example.test' })).status, 429);
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '192.0.2.200, 198.51.100.11').send({ email: 'x@example.test' })).status, 200);
});

test('P6-P8 deux proxies: Express ignore le préfixe forgé et retient le client observé par le proxy externe', async () => {
  const app = proxyApp(2);
  const first = await request(app).post('/login').set('X-Forwarded-For', '192.0.2.200, 198.51.100.20, 10.0.0.5').send({ email: 'x@example.test' });
  assert.equal(first.body.ip, '198.51.100.20');
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '203.0.113.99, 198.51.100.20, 10.0.0.5').send({ email: 'x@example.test' })).status, 429);
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '192.0.2.200, 198.51.100.21, 10.0.0.5').send({ email: 'x@example.test' })).status, 200);
});

test('P5-P6 les clés IPv4 et IPv6 restent stables et distinctes via le proxy attendu', async () => {
  const app = proxyApp(1);
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '2001:db8::1').send({ email: 'v6@example.test' })).status, 200);
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '2001:0db8:0:0:0:0:0:1').send({ email: 'v6@example.test' })).status, 429);
  assert.equal((await request(app).post('/login').set('X-Forwarded-For', '198.51.100.30').send({ email: 'v6@example.test' })).status, 200);
});
