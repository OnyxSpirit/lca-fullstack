import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Request} from 'express';
import {assertAnyPermission,assertDelegablePermissions,assertPermission,can,type PermissionScope,type RbacContext} from '../src/modules/rbac/rbac.service.js';
import {HttpError} from '../src/shared/http-error.js';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const request=(permissions:Record<string,PermissionScope|null>,isSuperAdmin=true)=>({
  user:{sub:'1',email:'admin@test.local',roles:['SUPER_ADMIN'],agencyId:'1'},
  rbac:{roleId:'1',roleCode:'SUPER_ADMIN',isSuperAdmin,permissions:new Map(Object.entries(permissions))},
}) as unknown as Request;

test('RBAC-01..07 SUPER_ADMIN est autorisé uniquement par le catalogue et le scope persisté',async()=>{
  const actor=request({'sales.view':'GLOBAL'});
  assert.equal(await assertPermission(actor,'sales.view'),'GLOBAL');
  await assert.rejects(()=>assertPermission(actor,'billing.view'),(error:unknown)=>error instanceof HttpError&&error.status===403);
  actor.rbac!.permissions.set('billing.view','AGENCY');
  assert.equal(await assertPermission(actor,'billing.view'),'AGENCY');
  actor.rbac!.permissions.delete('billing.view');
  await assert.rejects(()=>assertPermission(actor,'billing.view'),/Permission insuffisante/);
  for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const){
    actor.rbac!.permissions.set('scope.test',scope);
    assert.equal(await assertPermission(actor,'scope.test'),scope);
  }
});

test('RBAC-04/05 nom de rôle et is_system ne fabriquent aucune permission',async()=>{
  const actor=request({});
  assert.equal(can(actor.rbac as RbacContext,'settings.update'),false);
  await assert.rejects(()=>assertPermission(actor,'settings.update'),/Permission insuffisante/);
  await assert.rejects(()=>assertAnyPermission(actor,['settings.view','settings.update']),/Aucune permission/);
});

test('RBAC-08/09/15 rôles dynamiques et délégation utilisent le catalogue réel',()=>{
  const dynamic=request({'roles.permissions.manage':null,'crm.prospect.view':'AGENCY'},false).rbac as RbacContext;
  assert.equal(can(dynamic,'crm.prospect.view'),true);
  assert.equal(can(dynamic,'crm.prospect.update'),false);
  assert.doesNotThrow(()=>assertDelegablePermissions(dynamic,[{code:'crm.prospect.view',scope:'OWN'}]));
  assert.throws(()=>assertDelegablePermissions(dynamic,[{code:'crm.prospect.view',scope:'GLOBAL'}]),/Scope non délégable/);
  assert.throws(()=>assertDelegablePermissions(dynamic,[{code:'crm.prospect.update',scope:'OWN'}]),/Permission non délégable/);
});

test('RBAC-10..14 protections structurelles, auth réelle et rechargement DB restent explicites',()=>{
  const auth=source('src/modules/auth/auth.service.ts'),rbac=source('src/modules/rbac/rbac.service.ts'),users=source('src/modules/users/user.service.ts'),authenticate=source('src/middleware/authenticate.ts');
  assert.match(auth,/permissions: \[\.\.\.rbac\.permissions\.entries\(\)\]/);
  assert.doesNotMatch(auth,/code: ['"]\*['"]/);
  assert.match(rbac,/role_permissions rp JOIN permissions p/);
  assert.doesNotMatch(rbac,/if\(context\.isSuperAdmin\)/);
  assert.match(users,/LAST_SUPER_ADMIN/);
  assert.match(users,/if\(role\.is_system\)throw new HttpError\(403/);
  assert.match(authenticate,/resolveRbacContext\(user\.sub\)/);
});

test('RBAC-01 audit runtime : aucun module n’accorde un droit via isSuperAdmin',()=>{
  const authorizationSources=[
    'src/modules/rbac/rbac.service.ts',
    'src/middleware/require-permission.ts',
    'src/modules/notifications/notification.service.ts',
    'src/modules/crm/crm.realtime.ts',
    'src/realtime/socket.ts',
  ].map(source).join('\n');
  assert.doesNotMatch(authorizationSources,/if\([^\n]*isSuperAdmin[^\n]*\)(?:return true|return ['"]GLOBAL['"])/);
});
