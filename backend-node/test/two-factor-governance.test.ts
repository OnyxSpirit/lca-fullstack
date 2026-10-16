import test from 'node:test';
import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('2FA-GOV-01 migration 089 additive, permissions et amorçage système ciblé',()=>{
 const sql=source('database/migrations/089_two_factor_security_governance.sql');
 for(const permission of ['auth.2fa.settings.view','auth.2fa.settings.manage','auth.2fa.devices.view','auth.2fa.devices.revoke'])assert.match(sql,new RegExp(permission.replaceAll('.','\\.')));
 assert.match(sql,/r\.code='SUPER_ADMIN' AND r\.is_system=TRUE/);
 assert.doesNotMatch(sql,/DELETE|DROP|TRUNCATE/i);
 assert.match(sql,/ON DUPLICATE KEY UPDATE setting_key=VALUES\(setting_key\)/);
});

test('2FA-GOV-02 politique centrale expose uniquement les scopes autorisés',()=>{
 const policy=source('src/modules/rbac/permission-scope-policy.ts');
 assert.match(policy,/"auth\.2fa\.settings\.view"/);
 assert.match(policy,/"auth\.2fa\.settings\.manage"/);
 assert.match(policy,/code === "auth\.2fa\.devices\.view" \|\| code === "auth\.2fa\.devices\.revoke"/);
 assert.match(policy,/return \["GLOBAL"\]/);
});

test('2FA-GOV-03 routes séparent lecture et gestion, avec step-up sur écriture',()=>{
 const routes=source('src/modules/auth/two-factor-admin.routes.ts'),service=source('src/modules/auth/two-factor-admin.service.ts');
 assert.match(routes,/get\('\/auth\/2fa\/security-settings',requirePermission\('auth\.2fa\.settings\.view'\)/);
 assert.match(routes,/put\('\/auth\/2fa\/security-settings',requirePermission\('auth\.2fa\.settings\.manage'\)/);
 assert.match(service,/assertGlobal\(request,'auth\.2fa\.settings\.view'\)/);
 assert.match(service,/assertGlobal\(request,'auth\.2fa\.settings\.manage'\);await assertRecentStrongAuthentication/);
});

test('2FA-GOV-04 valeurs typées, bornées, fallback et audit sans secret',()=>{
 const settings=source('src/modules/auth/two-factor-security-settings.ts');
 assert.match(settings,/ABSOLUTE_TRUSTED_DEVICE_MAX_DAYS=30/);
 assert.match(settings,/strong<1\|\|strong>30/);
 assert.match(settings,/duration<1\|\|duration>max/);
 assert.match(settings,/DEFAULT_SECURITY_SETTINGS/);
 assert.match(settings,/writeAudit/);
 assert.doesNotMatch(settings,/encryption|recoveryCode|jwtSecret/i);
});

test('2FA-GOV-05 le step-up lit la durée persistée et le refresh ne la renouvelle pas',()=>{
 const factor=source('src/modules/auth/two-factor.service.ts'),auth=source('src/modules/auth/auth.service.ts');
 assert.match(factor,/strongAuthDurationSeconds\(\)/);
 const refresh=auth.slice(auth.indexOf('export async function refresh'));
 assert.doesNotMatch(refresh,/strong_auth_at\s*=/);
});
