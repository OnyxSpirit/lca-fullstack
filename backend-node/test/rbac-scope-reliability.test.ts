import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  allowedScopesForPermission,
  delegationMetadata,
  isCompatiblePermissionScope,
} from "../src/modules/rbac/permission-scope-policy.js";
import { assertDelegablePermissions } from "../src/modules/rbac/rbac.service.js";

const read = (path: string) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("database/migrations/084_rbac_system_permission_bootstrap.sql");
const bootstrap = read("src/scripts/database-bootstrap.ts");
const service = read("src/modules/users/user.service.ts");
const rbacService = read("src/modules/rbac/rbac.service.ts");

const atelier = [
  "workshop.vehicles.view",
  "workshop.external_vehicle.create",
  "workshop.vehicle.associations.create",
  "workshop.vehicle.associations.view",
  "workshop.vehicle.associations.close",
];
const finance = [
  "hr.budget.fund.request",
  "hr.budget.fund.request.view",
  "hr.budget.fund.approve",
  "treasury.reservation.submit",
  "treasury.reservation.approve",
  "treasury.reservation.cancel",
  "treasury.reservation.expire",
];

test("RBAC-01..03 et 12..14 : amorçage ciblé, idempotent et durable", () => {
  for (const code of [...atelier, ...finance]) assert.ok(migration.includes(code));
  assert.match(migration, /r\.code='SUPER_ADMIN' AND r\.is_system=TRUE/);
  assert.match(migration, /ON DUPLICATE KEY UPDATE/);
  assert.doesNotMatch(migration, /DIRECTOR|ACCOUNTANT|SERVICE_MANAGER/);
  assert.match(bootstrap, /ensureSystemPermissionAdministration/);
  assert.match(bootstrap, /INSERT IGNORE INTO role_permissions/);
  assert.match(bootstrap, /p\.is_active=TRUE/);
});

test("RBAC-04..08 : les scopes exposés suivent la politique métier", () => {
  assert.deepEqual(allowedScopesForPermission("workshop.vehicles.view"), [
    "OWN",
    "AGENCY",
    "CONCESSION",
    "GLOBAL",
  ]);
  assert.deepEqual(allowedScopesForPermission("treasury.reservation.approve"), [
    "AGENCY",
    "CONCESSION",
    "GLOBAL",
  ]);
  assert.deepEqual(allowedScopesForPermission("delivery.checklist.manage"), [
    "CONCESSION",
    "GLOBAL",
  ]);
  assert.equal(isCompatiblePermissionScope("treasury.view", "OWN"), false);
  assert.equal(isCompatiblePermissionScope("treasury.view", "AGENCY"), true);
});

test("RBAC-09..10 : délégation bornée et refus d'un acteur non autorisé", () => {
  const context = {
    roleId: "1",
    roleCode: "ADMIN_RBAC",
    isSuperAdmin: false,
    permissions: new Map([["workshop.vehicles.view", "CONCESSION" as const]]),
  };
  assert.doesNotThrow(() =>
    assertDelegablePermissions(context, [
      { code: "workshop.vehicles.view", scope: "AGENCY" },
    ]),
  );
  assert.throws(() =>
    assertDelegablePermissions(context, [
      { code: "workshop.vehicles.view", scope: "GLOBAL" },
    ]),
  );
  assert.throws(() =>
    assertDelegablePermissions(context, [
      { code: "treasury.reservation.approve", scope: "AGENCY" },
    ]),
  );
});

test("RBAC-15..17 : catalogue dynamique et permissions effectives", () => {
  const context = {
    roleId: "1",
    roleCode: "SUPER_ADMIN",
    isSuperAdmin: true,
    permissions: new Map([["treasury.reservation.approve", "GLOBAL" as const]]),
  };
  assert.deepEqual(delegationMetadata(context, "treasury.reservation.approve"), {
    allowedScopes: ["AGENCY", "CONCESSION", "GLOBAL"],
    delegable: true,
    maxDelegableScope: "GLOBAL",
  });
  assert.match(service, /allowedScopes|delegationMetadata/);
  assert.match(rbacService, /Cette permission n'est pas compatible/);
  assert.match(service, /DELETE FROM role_permissions WHERE role_id=\?/);
});

test("RBAC-11 et 18..20 : protections historiques conservées", () => {
  assert.match(service, /Un rôle système ne peut pas être modifié/);
  assert.match(service, /Permission inactive ou introuvable/);
  assert.doesNotMatch(service, /if\s*\([^)]*isSuperAdmin[^)]*\)\s*return/);
  for (const code of [...atelier, ...finance]) assert.ok(migration.includes(code));
});
