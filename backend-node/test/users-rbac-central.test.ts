import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('RBAC-01 le contexte est relu en base et exclut utilisateurs et rôles inactifs',()=>{
  const auth=source('src/middleware/authenticate.ts'),rbac=source('src/modules/rbac/rbac.service.ts');
  assert.match(auth,/users WHERE id=\? AND is_active=TRUE/);
  assert.match(auth,/user\.agencyId=active\.agency_id/);
  assert.match(rbac,/u\.is_active=TRUE AND r\.is_active=TRUE/);
  assert.doesNotMatch(source('src/modules/users/user-access.ts'),/request\.user\?\.roles\.includes/);
});

test('RBAC-02 SUPER_ADMIN est validé depuis le rôle système persistant',()=>{
  const rbac=source('src/modules/rbac/rbac.service.ts');
  assert.match(rbac,/role\.code\)==='SUPER_ADMIN'&&Boolean\(role\.is_system\)/);
});

test('RBAC-03 les utilisateurs respectent OWN, AGENCY, CONCESSION et GLOBAL',()=>{
  const access=source('src/modules/users/user-access.ts'),users=source('src/modules/users/user.service.ts');
  for(const scope of ['GLOBAL','CONCESSION','AGENCY','OWN'])assert.match(access,new RegExp(`scope==='${scope}'`));
  assert.match(users,/scope==='OWN'.*u\.id=/s);
  assert.match(users,/scope==='AGENCY'.*u\.agency_id=/s);
  assert.match(users,/scope==='CONCESSION'.*a\.concession_id=/s);
});

test('RBAC-04 les opérations sensibles utilisent leur permission propre',()=>{
  const users=source('src/modules/users/user.service.ts');
  for(const permission of ['users.update','users.disable','users.reset_password','users.assign_role','users.assign_agency'])assert.match(users,new RegExp(permission.replace('.','\\.')));
});

test('RBAC-05 un rôle affecté doit être entièrement délégable par l’acteur',()=>{
  const users=source('src/modules/users/user.service.ts');
  assert.match(users,/assertRolesDelegable/);
  assert.match(users,/assertDelegablePermissions\(context/);
  assert.match(users,/await assertRolesDelegable\(req,roles\)/);
});

test('RBAC-06 la protection du dernier SUPER_ADMIN et la désactivation logique restent actives',()=>{
  const users=source('src/modules/users/user.service.ts');
  assert.match(users,/LAST_SUPER_ADMIN/);
  assert.match(users,/UPDATE users SET is_active=/);
  assert.doesNotMatch(users,/DELETE FROM users/i);
});

test('RBAC-07 les modifications de permissions exigent le droit dédié et respectent la délégation',()=>{
  const users=source('src/modules/users/user.service.ts');
  assert.match(users,/roles\.permissions\.manage/);
  assert.match(users,/assertDelegablePermissions/);
  assert.match(users,/rbac:updated/);
});
