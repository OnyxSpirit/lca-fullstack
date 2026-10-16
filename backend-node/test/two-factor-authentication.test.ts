import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

process.env.TWO_FACTOR_ENCRYPTION_KEY = randomBytes(32).toString('base64');

const crypto = await import('../src/modules/auth/two-factor-crypto.js');
const migration = readFileSync(new URL('../database/migrations/087_two_factor_authentication.sql', import.meta.url), 'utf8');
const stepUpMigration = readFileSync(new URL('../database/migrations/088_two_factor_strong_authentication.sql', import.meta.url), 'utf8');
const authService = readFileSync(new URL('../src/modules/auth/auth.service.ts', import.meta.url), 'utf8');
const factorService = readFileSync(new URL('../src/modules/auth/two-factor.service.ts', import.meta.url), 'utf8');
const adminService = readFileSync(new URL('../src/modules/auth/two-factor-admin.service.ts', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../src/modules/auth/auth.routes.ts', import.meta.url), 'utf8');

test('2FA-01: les secrets TOTP sont chiffrés en AES-256-GCM et une altération est refusée', () => {
  const secret = 'JBSWY3DPEHPK3PXP';
  const box = crypto.encryptSecret(secret);
  assert.notEqual(box.ciphertext, secret);
  assert.equal(crypto.decryptSecret(box), secret);
  assert.throws(() => crypto.decryptSecret({ ...box, ciphertext: `${box.ciphertext.slice(0, -2)}AA` }));
});

test('2FA-02: les codes de récupération ne sont persistés que sous forme de hash non réversible', () => {
  const value = 'AAAA-BBBB-CCCC-DDDD-EEEE';
  const digest = crypto.hashRecoveryCode(value);
  assert.match(digest, /^[a-f0-9]{64}$/);
  assert.notEqual(digest, value);
  assert.equal(digest, crypto.hashRecoveryCode(value.toLowerCase()));
});

test('2FA-03: la migration est additive, relationnelle et n’accorde les droits qu’au Super Admin système', () => {
  assert.match(migration, /CREATE TABLE user_two_factor_auth/);
  assert.match(migration, /CREATE TABLE two_factor_recovery_codes/);
  assert.match(migration, /CREATE TABLE two_factor_challenges/);
  assert.match(migration, /CREATE TABLE role_two_factor_policies/);
  assert.match(migration, /FOREIGN KEY\(user_id\) REFERENCES users\(id\) ON DELETE CASCADE/);
  assert.match(migration, /r\.code='SUPER_ADMIN' AND r\.is_system=TRUE/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM users/i);
});

test('2FA-04: aucun jeton de session n’est émis avant le second facteur requis', () => {
  const decision = authService.slice(authService.indexOf('export async function login'), authService.indexOf('async function complete'));
  assert.match(decision, /createLoginChallenge/);
  assert.match(decision, /two_factor_required/);
  assert.match(decision, /two_factor_setup_required/);
  assert.match(decision, /consumeTrustedDevice[\s\S]*issueTokens\(user,roles,true,false\)/);
  assert.match(decision, /createLoginChallenge[\s\S]*return\{status:state\.enabled/);
  assert.match(authService, /assertSessionCurrent\(String\(user\.id\),sessionId\)/);
  assert.match(authService, /confirmChallengeSetup[\s\S]*complete\(result\.userId,result\.recoveryCodes\)/);
  assert.match(authService, /issueTokens\(user,roles,true\)/);
  assert.match(authService, /two_factor_verified_at,strong_auth_at,strong_auth_method,two_factor_grandfathered/);
  assert.match(factorService, /const sqlBoolean=\(value:unknown\)=>Number\(value\)===1/);
  assert.doesNotMatch(factorService, /resetRequired:Boolean\(row\.reset_required\)/);
});

test('2FA-05: challenge, anti-rejeu, récupération atomique et limitation progressive sont présents', () => {
  assert.match(factorService, /afterTimeStep:last/);
  assert.match(factorService, /last_accepted_time_step/);
  assert.match(factorService, /blocked_until=DATE_ADD/);
  assert.match(factorService, /used_at IS NULL FOR UPDATE/);
  assert.match(factorService, /UPDATE two_factor_recovery_codes SET used_at=NOW\(\)/);
  assert.match(routes, /\/2fa\/verify',\.\.\.limits\.login/);
  assert.match(routes, /\/2fa\/recovery',\.\.\.limits\.login/);
});

test('2FA-06: les opérations administratives imposent périmètre, authentification forte et protections Super Admin', () => {
  assert.match(adminService, /assertCanManage/);
  assert.match(adminService, /assertCanViewTargetActor/);
  assert.match(adminService, /assertRecentStrongAuthentication/);
  assert.match(adminService, /SUPER_ADMIN/);
  assert.match(adminService, /is_system/);
  assert.match(adminService, /Seul un Super Administrateur peut réinitialiser ce compte privilégié/);
  assert.match(adminService, /permissions\.get\('auth\.2fa\.policy\.manage'\)!=='GLOBAL'/);
});

test('2FA-07: le step-up est additif, lié à la session et comparé en UTC sans parsing JavaScript', () => {
  assert.match(stepUpMigration, /ALTER TABLE refresh_tokens/);
  assert.match(stepUpMigration, /strong_auth_at DATETIME NULL/);
  assert.match(stepUpMigration, /strong_auth_method ENUM\('PASSWORD','PASSWORD_TOTP'\) NULL/);
  assert.doesNotMatch(stepUpMigration, /DROP|TRUNCATE|DELETE/i);
  assert.match(factorService, /strong_auth_at>=DATE_SUB\(UTC_TIMESTAMP\(\),INTERVAL \? SECOND\)/);
  assert.match(factorService, /WHERE id=\? AND user_id=\? AND revoked_at IS NULL/);
  assert.doesNotMatch(factorService.slice(factorService.indexOf('assertRecentStrongAuthentication'),factorService.indexOf('auditStepUpFailure')), /new Date|Date\.now/);
});

test('2FA-08: le step-up exige mot de passe, TOTP actif, anti-rejeu, audit et n’accorde aucune permission', () => {
  const stepUp = factorService.slice(factorService.indexOf('export async function stepUp'), factorService.indexOf('export async function regenerateRecovery'));
  assert.match(stepUp, /argon2\.verify/);
  assert.match(stepUp, /state\.enabled/);
  assert.match(stepUp, /verifyCurrentFactor/);
  assert.match(factorService, /afterTimeStep:last/);
  assert.match(stepUp, /strong_auth_at=UTC_TIMESTAMP\(\)/);
  assert.match(stepUp, /auth\.2fa\.step_up_succeeded/);
  assert.doesNotMatch(stepUp, /permissions|role_permissions|SUPER_ADMIN/);
  assert.match(routes, /\/2fa\/step-up',authenticate,limits\.stepUp/);
});
