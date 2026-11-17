import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Request} from 'express';
import {intersectScopePredicates,permissionScopePredicate} from '../src/modules/rbac/scope-intersection.js';

type Scope='OWN'|'AGENCY';
const request=(primary?:Scope,secondary?:Scope)=>({
  user:{sub:'42',agencyId:'7',roles:['RBAC02_DYNAMIC']},
  rbac:{roleId:'99',roleCode:'RBAC02_DYNAMIC',isSuperAdmin:false,permissions:new Map([
    ...(primary?[['primary',primary] as const]:[]),
    ...(secondary?[['secondary',secondary] as const]:[])
  ])}
}) as unknown as Request;
const intersection=(primary?:Scope,secondary?:Scope)=>{
  const context=request(primary,secondary),resource={agency:'x.agency_id',owner:'x.owner_id'};
  return intersectScopePredicates(permissionScopePredicate(context,'primary',resource),permissionScopePredicate(context,'secondary',resource));
};

test('RBAC02-01 AGENCY x AGENCY reste borné à l’agence',()=>assert.deepEqual(intersection('AGENCY','AGENCY'),{sql:'(x.agency_id=?) AND (x.agency_id=?)',params:['7','7']}));
test('RBAC02-02 OWN x AGENCY conserve agence et propriétaire',()=>assert.deepEqual(intersection('OWN','AGENCY'),{sql:'(x.agency_id=? AND x.owner_id=?) AND (x.agency_id=?)',params:['7','42','7']}));
test('RBAC02-03 AGENCY x OWN conserve agence et propriétaire',()=>assert.deepEqual(intersection('AGENCY','OWN'),{sql:'(x.agency_id=?) AND (x.agency_id=? AND x.owner_id=?)',params:['7','7','42']}));
test('RBAC02-04 OWN x OWN conserve les deux contrôles de propriété',()=>assert.deepEqual(intersection('OWN','OWN')?.params,['7','42','7','42']));
test('RBAC02-08 deux agences différentes restent séparées',()=>assert.deepEqual(permissionScopePredicate(request('AGENCY'),'primary',{agency:'resource.agency_id'}),{sql:'resource.agency_id=?',params:['7']}));
test('RBAC02-09 les anciens scopes sont refusés',()=>{for(const invalid of['CONCESSION','GLOBAL'])assert.equal(permissionScopePredicate(request(invalid as Scope),'primary',{agency:'resource.agency_id'}),null)});
test('RBAC02-10 un rôle dynamique est gouverné uniquement par sa map de permissions',()=>assert.deepEqual(intersection('AGENCY','AGENCY')?.params,['7','7']));
test('RBAC02-11 un faux SUPER_ADMIN sans permission ne bénéficie d’aucun bypass',()=>{const context=request() as any;context.rbac.roleCode='SUPER_ADMIN';context.rbac.isSuperAdmin=true;assert.equal(permissionScopePredicate(context,'primary',{agency:'x.agency_id'}),null)});
test('RBAC02-12 une permission secondaire absente rend la section inaccessible',()=>assert.equal(intersection('AGENCY'),null));

test('RBAC02 les six périmètres composites emploient des prédicats de permission secondaires',()=>{
  const source=(module:string)=>readFileSync(new URL(`../src/modules/${module}`,import.meta.url),'utf8');
  assert.match(source('dashboard/dashboard.routes.ts'),/intersectScopePredicates/);
  assert.match(source('customers/customer.routes.ts'),/permissionScopePredicate/);
  assert.match(source('vehicles/vehicle.routes.ts'),/permissionScopePredicate/);
  assert.match(source('sales/sale.service.ts'),/permissionScopePredicate/);
  assert.match(source('billing/billing.routes.ts'),/permissionScopePredicate/);
  assert.match(source('parts/part.routes.ts'),/assertAgencyScope/);
});
