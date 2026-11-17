import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{allowedScopesForPermission,isCompatiblePermissionScope,permissionScopes}from'../src/modules/rbac/permission-scope-policy.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const migration=read('../database/migrations/131_rbac_two_scopes.sql');
const guard=read('../database/migrations/132_rbac_scope_bootstrap_guard.sql');
const users=read('../src/modules/users/user.service.ts');
const bootstrap=read('../src/scripts/database-bootstrap.ts');

test('RBAC-FINAL-01 la politique n’expose que OWN et AGENCY',()=>{
 assert.deepEqual(permissionScopes,['OWN','AGENCY']);
 for(const code of['users.view','treasury.view','delivery.checklist.manage','auth.2fa.policy.manage']){
  assert.ok(allowedScopesForPermission(code).every(scope=>scope==='OWN'||scope==='AGENCY'));
  assert.equal(isCompatiblePermissionScope(code,'CONCESSION' as never),false);
  assert.equal(isCompatiblePermissionScope(code,'GLOBAL' as never),false);
 }
});

test('RBAC-FINAL-02 les entrées API refusent les anciens scopes',()=>{
 assert.match(users,/\['OWN','AGENCY'\]\.includes\(scope\)/);
 assert.match(users,/acceptent uniquement OWN et AGENCY/);
});

test('RBAC-FINAL-03 la migration réduit, met en quarantaine et contraint le schéma',()=>{
 assert.match(migration,/rbac_scope_migration_history/);
 assert.match(migration,/QUARANTINED_AMBIGUOUS/);
 assert.match(migration,/SET scope='AGENCY'/);
 assert.match(migration,/DELETE FROM role_permissions WHERE scope IS NULL/);
 assert.match(migration,/ENUM\('OWN','AGENCY'\) NOT NULL/);
 assert.match(guard,/CHECK \(scope IN \('OWN','AGENCY'\)\)/);
 assert.match(bootstrap,/SELECT \?,p\.id,'AGENCY'/);
 assert.doesNotMatch(bootstrap,/SELECT \?,p\.id,'GLOBAL'/);
});
