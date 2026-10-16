import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { generate } from 'otplib';

const baseUrl = process.env.LCA_E2E_BASE_URL;
const email = process.env.LCA_E2E_EMAIL;
const password = process.env.LCA_E2E_PASSWORD;
if (!baseUrl || !email || !password) throw new Error('LCA_E2E_BASE_URL, LCA_E2E_EMAIL et LCA_E2E_PASSWORD sont requis');

const trace = [];
async function request(path, { method = 'GET', body, accessToken } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => null);
  trace.push({ method, path, status: response.status });
  return { status: response.status, payload };
}
const post = (path, body, accessToken) => request(path, { method: 'POST', body, accessToken });
const tokenClaims = token => JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const nextTotpWindow = async () => sleep((31 - (Math.floor(Date.now() / 1000) % 30)) * 1000);

const login = await post('/auth/login', { email, password });
assert.equal(login.status, 200);
assert.equal(login.payload.status, 'two_factor_setup_required');
assert.equal(login.payload.accessToken, undefined, 'aucun access token avant le second facteur');
assert.equal(login.payload.refreshToken, undefined, 'aucun refresh token avant le second facteur');

const setup = await post('/auth/2fa/challenge/setup', { challengeToken: login.payload.challengeToken });
assert.equal(setup.status, 200);
assert.equal(typeof setup.payload.manualKey, 'string');
const secret = setup.payload.manualKey;
const totp = epoch => generate({ secret, algorithm: 'sha1', digits: 6, period: 30, ...(epoch ? { epoch } : {}) });
const firstCode = await totp();

const confirmation = await post('/auth/2fa/challenge/confirm', { challengeToken: login.payload.challengeToken, code: firstCode });
assert.equal(confirmation.status, 200);
assert.equal(confirmation.payload.status, 'authenticated');
assert.equal(typeof confirmation.payload.accessToken, 'string');
assert.equal(typeof confirmation.payload.refreshToken, 'string');
assert.equal(Array.isArray(confirmation.payload.recoveryCodes), true);
const firstAccess = confirmation.payload.accessToken;
const firstRefresh = confirmation.payload.refreshToken;
const accessClaims = tokenClaims(firstAccess);
const refreshClaims = tokenClaims(firstRefresh);
assert.equal(typeof accessClaims.sid, 'string');
assert.equal(refreshClaims.sid, accessClaims.sid);
assert.equal(refreshClaims.type, 'refresh');

const firstMe = await request('/auth/me', { accessToken: firstAccess });
if (firstMe.status !== 200) console.error(JSON.stringify({ stage: 'first-auth-me', status: firstMe.status, message: firstMe.payload?.message, claims: { sidPresent: Boolean(accessClaims.sid), sidHash: createHash('sha256').update(accessClaims.sid).digest('hex'), lifetimeSeconds: accessClaims.exp - accessClaims.iat, expiresInSeconds: accessClaims.exp - Math.floor(Date.now() / 1000) } }));
assert.equal(firstMe.status, 200);
assert.equal((await request('/users/directory', { accessToken: firstAccess })).status, 200);
const concurrentProtected = await Promise.all(Array.from({ length: 8 }, () => request('/auth/me', { accessToken: firstAccess })));
assert.equal(concurrentProtected.every(result => result.status === 200), true);

const rotated = await post('/auth/refresh', { refreshToken: firstRefresh });
assert.equal(rotated.status, 200);
assert.notEqual(rotated.payload.refreshToken, firstRefresh);
assert.equal(tokenClaims(rotated.payload.refreshToken).sid, accessClaims.sid);
assert.equal((await post('/auth/refresh', { refreshToken: firstRefresh })).status, 401);
assert.equal((await request('/auth/me', { accessToken: 'jwt.invalide.test' })).status, 401);
assert.equal((await request('/auth/me', { accessToken: rotated.payload.accessToken })).status, 200);

assert.equal((await post('/auth/logout', { refreshToken: rotated.payload.refreshToken }, rotated.payload.accessToken)).status, 200);
assert.equal((await post('/auth/refresh', { refreshToken: rotated.payload.refreshToken })).status, 401);

const relogin = await post('/auth/login', { email, password });
assert.equal(relogin.status, 200);
assert.equal(relogin.payload.status, 'two_factor_required');
assert.equal(relogin.payload.qrCodeDataUrl, undefined, 'LOGIN_VERIFY ne doit pas renvoyer de QR');
assert.equal((await post('/auth/2fa/verify', { challengeToken: relogin.payload.challengeToken, code: '000000' })).status, 401);
await sleep(2_100); // backoff progressif après la première tentative invalide
const expiredCode = await totp(Date.now() - 90_000);
assert.equal((await post('/auth/2fa/verify', { challengeToken: relogin.payload.challengeToken, code: expiredCode })).status, 401);

await sleep(4_100); // deuxième échec : backoff exponentiel de 4 secondes + marge anti-flakiness
await nextTotpWindow();
const verifyCode = await totp();
const verified = await post('/auth/2fa/verify', { challengeToken: relogin.payload.challengeToken, code: verifyCode });
assert.equal(verified.status, 200);
assert.equal(verified.payload.status, 'authenticated');
assert.equal((await request('/auth/me', { accessToken: verified.payload.accessToken })).status, 200);

const replayLogin = await post('/auth/login', { email, password });
assert.equal(replayLogin.payload.status, 'two_factor_required');
assert.equal((await post('/auth/2fa/verify', { challengeToken: replayLogin.payload.challengeToken, code: verifyCode })).status, 401);

const refreshRace = await Promise.all(Array.from({ length: 8 }, () => post('/auth/refresh', { refreshToken: verified.payload.refreshToken })));
assert.equal(refreshRace.filter(result => result.status === 200).length, 1);
assert.equal(refreshRace.filter(result => result.status === 401).length, 7);
const raceWinner = refreshRace.find(result => result.status === 200).payload;
assert.equal((await request('/auth/me', { accessToken: raceWinner.accessToken })).status, 200);
assert.equal((await post('/auth/logout', { refreshToken: raceWinner.refreshToken }, raceWinner.accessToken)).status, 200);

console.log(JSON.stringify({ result: 'PASS', checks: trace.length, trace }));
