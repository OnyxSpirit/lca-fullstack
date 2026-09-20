import assert from 'node:assert/strict';
import test from 'node:test';
import { canNavigateWithPermissions, hasDynamicPermission } from '../src/navigation/permissions';
import { documentEntitiesForPermissions } from '../src/modules/documents/documentPolicy';

test('un rôle personnalisé absent de ROLE_PERMISSIONS conserve ses droits dynamiques',()=>{
  const permissions={'vehicles.view':'AGENCY' as const,'vehicles.create':'OWN' as const};
  assert.equal(hasDynamicPermission(permissions,'vehicles.view'),true);
  assert.equal(hasDynamicPermission(permissions,'vehicles.create'),true);
  assert.equal(hasDynamicPermission(permissions,'vehicles.update'),false);
});

test('le frontend refuse toute permission absente sans fallback de rôle',()=>{
  assert.equal(hasDynamicPermission(undefined,'users.view'),false);
  assert.equal(hasDynamicPermission({},'users.view'),false);
});

test('la portée reste distincte de la présence de permission',()=>{
  const permissions={'parts.stock.view':'AGENCY' as const,'users.view':'OWN' as const};
  assert.equal(hasDynamicPermission(permissions,'parts.stock.view'),true);
  assert.equal(permissions['parts.stock.view'],'AGENCY');
  assert.equal(permissions['users.view'],'OWN');
});

test('un simple nom de rôle historique ne crée aucun droit dynamique',()=>{
  assert.equal(hasDynamicPermission({},'parts.stock.adjust'),false);
  assert.equal(hasDynamicPermission({role:'DIRECTOR'},'parts.stock.adjust'),false);
});

test('RBAC-FE-01 un rôle inconnu obtient navigation et GED uniquement par permissions',()=>{
  const permissions={'reporting.view':'AGENCY','ged.view':'AGENCY','customers.view':'AGENCY'};
  assert.equal(canNavigateWithPermissions(permissions,'/reports'),true);
  assert.equal(canNavigateWithPermissions(permissions,'/documents'),true);
  assert.deepEqual(documentEntitiesForPermissions(permissions).map(x=>x.value),['customer']);
});

test('RBAC-FE-02 ajout et retrait de permission actualisent immédiatement la navigation',()=>{
  const permissions:Record<string,unknown>={};
  assert.equal(canNavigateWithPermissions(permissions,'/parts'),false);
  permissions['parts.view']='AGENCY';
  assert.equal(canNavigateWithPermissions(permissions,'/parts'),true);
  delete permissions['parts.view'];
  assert.equal(canNavigateWithPermissions(permissions,'/parts'),false);
});

test('RBAC-FE-03 GLOBAL ne crée pas de bypass Super Admin',()=>{
  const permissions={'parts.stock.view':'GLOBAL'};
  assert.equal(hasDynamicPermission(permissions,'parts.stock.view'),true);
  assert.equal(hasDynamicPermission(permissions,'roles.permissions.manage'),false);
});
