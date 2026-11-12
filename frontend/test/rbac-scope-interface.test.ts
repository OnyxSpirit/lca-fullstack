import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync(
  new URL("../src/modules/users/RoleManagementPanel.tsx", import.meta.url),
  "utf8",
);
const hooks = readFileSync(
  new URL("../src/api/userHooks.ts", import.meta.url),
  "utf8",
);

test("RBAC-15 : l'interface consomme les scopes autorisés du backend", () => {
  assert.match(hooks, /allowedScopes:RbacScope\[\]/);
  assert.match(panel, /businessScopesForPermission\(permission\.allowedScopes\)/);
  assert.doesNotMatch(panel, /const scopes:RbacScope\[\]/);
});

test("RBAC-08 : un scope incompatible est signalé sans remplacement silencieux", () => {
  assert.match(panel, /incompatible/);
  assert.match(panel, /Choisissez explicitement un périmètre compatible/);
  assert.match(panel, /hasIncompatibleScope/);
  assert.match(panel, /value=\{bad\?'':scope\?\?fallback\}/);
  assert.match(panel, /Correction requise/);
  assert.match(panel, /e\.target\.value as RbacScope/);
});

test("RBAC-09..10 : la délégabilité est visible et bornée", () => {
  assert.match(panel, /permission\.delegable/);
  assert.match(panel, /Non délégable avec vos droits actuels/);
  assert.match(hooks, /maxDelegableScope/);
});

test("RBAC-SUPER-01 : le rôle système ne reçoit jamais les alertes métier",()=>{
  assert.match(panel,/hasIncompatibleScope=!selected\?\.is_system&&/);
  assert.match(panel,/bad=!selected\.is_system&&isIncompatibleBusinessScope/);
  assert.match(panel,/Rôle système protégé — Accès administrateur complet/);
  assert.match(panel,/Privilège système natif · lecture seule/);
  assert.match(panel,/!selected\.is_system&&!permission\.delegable/);
  assert.match(panel,/!selected\.is_system&&scopes\.length===0/);
});

test("RBAC-SUPER-02 : les rôles métier gardent la correction explicite",()=>{
  assert.match(panel,/businessScopesForPermission\(permission\.allowedScopes\)/);
  assert.match(panel,/value=\{bad\?'':scope\?\?fallback\}/);
  assert.match(panel,/Choisissez explicitement un périmètre compatible/);
  assert.match(panel,/disabled=\{scope==null\|\|!permission\.delegable\}/);
});
