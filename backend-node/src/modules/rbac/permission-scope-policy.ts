import type { PermissionBusinessScope, PermissionScope, RbacContext } from "./rbac.service.js";

export const permissionScopes = [
  "OWN",
  "AGENCY",
] as const satisfies readonly PermissionBusinessScope[];

const collectiveScopes = ["AGENCY"] as const;

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
  "settings.general.",
  "settings.documents.",
  "settings.workshop_rates.",
  "settings.agencies.",
] as const;

const collectiveCodes = new Set([
  "delivery.financial_override.authorize",
  "delivery.service.manage",
  "delivery.service.price",
  "reporting.view",
  "stamp.manage",
  "stamp.assign_agencies",
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
const agencyOnlyCodes = new Set([
  "auth.2fa.policy.manage",
  "auth.2fa.settings.view",
  "auth.2fa.settings.manage",
]);

const legacyDelegationParents: Record<string,string> = {
  'settings.general.view':'settings.view','settings.general.manage':'settings.update',
  'settings.documents.view':'settings.view','settings.documents.manage':'settings.update',
  'settings.workshop_rates.view':'settings.view','settings.workshop_rates.manage':'settings.update',
  'settings.agencies.view':'settings.view','settings.agencies.manage':'settings.update',
};

export function delegableGrant(context:RbacContext,code:string):PermissionScope|null{
  return context.permissions.get(code)??context.permissions.get(legacyDelegationParents[code]??'')??null;
}

/**
 * Source de vérité des scopes attribuables. Les routes restent responsables de
 * l'intersection avec la ressource; cette politique empêche seulement les
 * scopes que leur implémentation rejette explicitement.
 *
 * Le privilège du Super Administrateur est porté par le rôle système, pas par
 * un scope de données. Toute permission persistée reste OWN ou AGENCY.
 */
export function allowedScopesForPermission(
  code: string,
): readonly PermissionBusinessScope[] {
  if (ownOnlyCodes.has(code)) return ["OWN"];
  if (agencyOnlyCodes.has(code)) return ["AGENCY"];
  if (code === "auth.2fa.devices.delete") return collectiveScopes;
  if (code === "auth.2fa.devices.view" || code === "auth.2fa.devices.revoke")
    return permissionScopes;
  if (code.startsWith("auth.2fa.users.")) return collectiveScopes;
  if (concessionOnlyPrefixes.some((prefix) => code.startsWith(prefix)))
    return collectiveScopes;
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
  if (scope === null || (scope!=='OWN'&&scope!=='AGENCY') || !allowedScopesForPermission(code).includes(scope)) {
    throw new Error(`INCOMPATIBLE_PERMISSION_SCOPE:${code}:${scope ?? "NULL"}`);
  }
}

export const isCompatiblePermissionScope = (
  code: string,
  scope: PermissionScope | null,
) => scope !== null && (scope==='OWN'||scope==='AGENCY') && allowedScopesForPermission(code).includes(scope);

export type HistoricalScopeDecision="AGENCY"|"OWN_OR_REMOVE"|"POLICY_REVIEW"|"SYSTEM_PROTECTED";
export function historicalScopeDecision(code:string,isSystemRole=false):HistoricalScopeDecision{
  if(isSystemRole)return"SYSTEM_PROTECTED";
  const allowed=allowedScopesForPermission(code);
  if(allowed.includes("AGENCY"))return"AGENCY";
  if(allowed.includes("OWN"))return"OWN_OR_REMOVE";
  return"POLICY_REVIEW";
}

const scopeRank: Record<PermissionBusinessScope, number> = {
  OWN: 1,
  AGENCY: 2,
};

export function delegationMetadata(context: RbacContext, code: string) {
  const granted = delegableGrant(context,code);
  const allowedScopes = [...allowedScopesForPermission(code)];
  const delegableScopes = granted==='OWN'||granted==='AGENCY'
    ? allowedScopes.filter((scope) => scopeRank[scope] <= scopeRank[granted])
    : [];
  return {
    allowedScopes,
    delegable: delegableScopes.length > 0,
    maxDelegableScope: delegableScopes.at(-1) ?? null,
  };
}
