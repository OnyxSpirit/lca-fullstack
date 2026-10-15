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
  assert.match(panel, /permission\.allowedScopes\.map/);
  assert.doesNotMatch(panel, /const scopes:RbacScope\[\]/);
});

test("RBAC-08 : un scope incompatible est signalé sans remplacement silencieux", () => {
  assert.match(panel, /incompatible/);
  assert.match(panel, /Sélectionnez un périmètre compatible/);
  assert.match(panel, /hasIncompatibleScope/);
});

test("RBAC-09..10 : la délégabilité est visible et bornée", () => {
  assert.match(panel, /permission\.delegable/);
  assert.match(panel, /Non délégable avec vos droits actuels/);
  assert.match(hooks, /maxDelegableScope/);
});
