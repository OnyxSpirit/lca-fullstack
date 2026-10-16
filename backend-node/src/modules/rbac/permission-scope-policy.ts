import type { PermissionScope, RbacContext } from "./rbac.service.js";

export const permissionScopes = [
  "OWN",
  "AGENCY",
  "CONCESSION",
  "GLOBAL",
] as const satisfies readonly PermissionScope[];

const collectiveScopes = ["AGENCY", "CONCESSION", "GLOBAL"] as const;
const concessionScopes = ["CONCESSION", "GLOBAL"] as const;

const concessionOnlyPrefixes = [
  "delivery.checklist.",
  "hr.leave.type.",
] as const;

const collectivePrefixes = [
  "bank_reconciliation.",
  "hr.budget.",
  "hr.expense.",
  "hr.reporting.",
  "supplier.",
  "treasury.",
] as const;

const collectiveCodes = new Set([
  "delivery.financial_override.authorize",
  "delivery.service.manage",
  "delivery.service.price",
  "reporting.view",
  "stamp.manage",
  "stamp.use",
  "stamp.view",
  "vehicles.archive",
  "workshop.assign_bay",
  "workshop.bay.manage",
  "workshop.plan",
  "workshop.resources.manage",
  "workshop.schedule.manage",
  "workshop.session.manage",
  "workshop.technicians.manage",
]);

const ownOnlyCodes = new Set(["auth.2fa.view", "auth.2fa.manage"]);
const globalOnlyCodes = new Set([
  "auth.2fa.policy.manage",
  "auth.2fa.settings.view",
  "auth.2fa.settings.manage",
]);

/**
 * Source de vérité des scopes attribuables. Les routes restent responsables de
 * l'intersection avec la ressource; cette politique empêche seulement les
 * scopes que leur implémentation rejette explicitement.
 *
 * GLOBAL reste compatible avec toute permission : c'est l'autorité utilisée
 * pour amorcer le rôle système authentique, jamais un bypass d'autorisation.
 */
export function allowedScopesForPermission(
  code: string,
): readonly PermissionScope[] {
  if (ownOnlyCodes.has(code)) return ["OWN"];
  if (globalOnlyCodes.has(code)) return ["GLOBAL"];
  if (code === "auth.2fa.devices.view" || code === "auth.2fa.devices.revoke")
    return permissionScopes;
  if (code.startsWith("auth.2fa.users.")) return collectiveScopes;
  if (concessionOnlyPrefixes.some((prefix) => code.startsWith(prefix)))
    return concessionScopes;
  if (
    collectiveCodes.has(code) ||
    collectivePrefixes.some((prefix) => code.startsWith(prefix))
  )
    return collectiveScopes;
  return permissionScopes;
}

export function assertCompatiblePermissionScope(
  code: string,
  scope: PermissionScope | null,
) {
  if (scope === null || !allowedScopesForPermission(code).includes(scope)) {
    throw new Error(`INCOMPATIBLE_PERMISSION_SCOPE:${code}:${scope ?? "NULL"}`);
  }
}

export const isCompatiblePermissionScope = (
  code: string,
  scope: PermissionScope | null,
) => scope !== null && allowedScopesForPermission(code).includes(scope);

const scopeRank: Record<PermissionScope, number> = {
  OWN: 1,
  AGENCY: 2,
  CONCESSION: 3,
  GLOBAL: 4,
};

export function delegationMetadata(context: RbacContext, code: string) {
  const granted = context.permissions.get(code) ?? null;
  const allowedScopes = [...allowedScopesForPermission(code)];
  const delegableScopes = granted
    ? allowedScopes.filter((scope) => scopeRank[scope] <= scopeRank[granted])
    : [];
  return {
    allowedScopes,
    delegable: delegableScopes.length > 0,
    maxDelegableScope: delegableScopes.at(-1) ?? null,
  };
}
