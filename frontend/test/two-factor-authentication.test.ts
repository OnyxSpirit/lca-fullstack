import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const login = readFileSync(new URL('../src/modules/auth/LoginPage.tsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/stores/authStore.ts', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../src/modules/auth/TwoFactorSettings.tsx', import.meta.url), 'utf8');
const administration = readFileSync(new URL('../src/modules/users/TwoFactorAdministration.tsx', import.meta.url), 'utf8');
const users = readFileSync(new URL('../src/modules/users/UsersManagementPage.tsx', import.meta.url), 'utf8');
const apiClient = readFileSync(new URL('../src/services/apiClient.ts', import.meta.url), 'utf8');

test('UI-2FA-01: la session frontend reste fermée pendant les challenges TOTP et enrollment', () => {
  assert.match(store, /two_factor_required/);
  assert.match(store, /two_factor_setup_required/);
  assert.match(store, /pendingTwoFactor/);
  assert.match(store, /pendingAuthenticatedSession/);
  assert.match(store, /localStorage\.setItem\(ACCESS_TOKEN_KEY,pending\.accessToken\)/);
  assert.ok(store.indexOf('localStorage.setItem(ACCESS_TOKEN_KEY,pending.accessToken)') < store.indexOf('isAuthenticated:true,pendingAuthenticatedSession:null'));
  assert.match(login, /Code de récupération/);
});

test('UI-2FA-02: enrollment présente QR, clé manuelle et codes une seule fois avant validation', () => {
  assert.match(login + settings, /qrCodeDataUrl/);
  assert.match(login + settings, /manualKey/);
  assert.match(login + settings, /recoveryCodes/);
  assert.match(login, /downloadCodes/);
  assert.match(login, /Je confirme avoir conservé ces codes/);
});

test('UI-2FA-03: les écrans personnels et administratifs respectent les permissions dynamiques', () => {
  assert.match(settings, /auth\.2fa\.manage/);
  assert.match(administration, /auth\.2fa\.users\.view/);
  assert.match(administration, /auth\.2fa\.users\.enforce/);
  assert.match(administration, /auth\.2fa\.users\.reset/);
  assert.match(administration, /auth\.2fa\.policy\.manage/);
  assert.match(users, /TwoFactorAdministration/);
});

test('UI-2FA-04: un refus métier 403 ne provoque pas la destruction de la session 2FA', () => {
  assert.match(apiClient, /error\.status===401/);
  assert.doesNotMatch(apiClient, /error\.status===401\|\|error\.status===403/);
  assert.match(apiClient, /if\(response\.status===401\)terminateSession/);
});
