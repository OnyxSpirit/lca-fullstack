import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const login = readFileSync(new URL('../src/modules/auth/LoginPage.tsx', import.meta.url), 'utf8');
const store = readFileSync(new URL('../src/stores/authStore.ts', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../src/modules/auth/TwoFactorSettings.tsx', import.meta.url), 'utf8');
const administration = readFileSync(new URL('../src/modules/users/TwoFactorAdministration.tsx', import.meta.url), 'utf8');
const users = readFileSync(new URL('../src/modules/users/UsersManagementPage.tsx', import.meta.url), 'utf8');
const apiClient = readFileSync(new URL('../src/services/apiClient.ts', import.meta.url), 'utf8');
const strongAuthentication = readFileSync(new URL('../src/modules/auth/StrongAuthenticationModal.tsx', import.meta.url), 'utf8');
const hooks = readFileSync(new URL('../src/api/twoFactorHooks.ts', import.meta.url), 'utf8');

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

test('UI-2FA-05: la politique par rôle expose explicitement ses deux états et conserve la bascule booléenne', () => {
  assert.match(administration, /required\?'Obligatoire':'Non obligatoire'/);
  assert.match(administration, /required\?'Retirer l’obligation':'Imposer la 2FA'/);
  assert.match(administration, /change\(policy\.role_id,!policy\.required\)/);
});

test('UI-2FA-06: le SUPER_ADMIN affiche sa protection système et ne permet pas son retrait', () => {
  assert.match(administration, /systemProtected=policy\.is_system&&policy\.code==='SUPER_ADMIN'/);
  assert.match(administration, /Obligatoire — Sécurité système/);
  assert.match(administration, /disabled=\{systemProtected\}/);
});

test('UI-2FA-07: la liste des politiques présente chargement, erreur et absence de rôle', () => {
  assert.match(administration, /policies\.isLoading&&/);
  assert.match(administration, /Chargement des politiques 2FA…/);
  assert.match(administration, /policies\.isError&&/);
  assert.match(administration, /Récupération des politiques 2FA impossible/);
  assert.match(administration, /policies\.data\?\.length===0/);
  assert.match(administration, /Aucun rôle disponible\./);
});

test('UI-2FA-08: le step-up demande le mot de passe, le TOTP éventuel et permet l’annulation', () => {
  assert.match(strongAuthentication, /Mot de passe actuel/);
  assert.match(strongAuthentication, /Code TOTP si activé/);
  assert.match(strongAuthentication, /Annuler/);
  assert.match(hooks, /\/auth\/2fa\/step-up/);
});

test('UI-2FA-09: une mutation sensible n’est jamais rejouée automatiquement après le step-up', () => {
  assert.match(strongAuthentication, /L’opération initiale ne sera pas relancée automatiquement/);
  assert.match(administration, /Relancez explicitement l’opération sensible/);
  assert.match(administration, /Relancez explicitement la modification de politique/);
  assert.doesNotMatch(strongAuthentication, /onConfirmed\([^)]*mutateAsync/);
});
