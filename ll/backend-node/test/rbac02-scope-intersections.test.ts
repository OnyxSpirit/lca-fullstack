import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Request} from 'express';
import {intersectScopePredicates,permissionScopePredicate} from '../src/modules/rbac/scope-intersection.js';

type Scope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
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

test('RBAC02-01 GLOBAL x GLOBAL reste global',()=>assert.deepEqual(intersection('GLOBAL','GLOBAL'),{sql:'(1=1) AND (1=1)',params:[]}));
test('RBAC02-02 GLOBAL x AGENCY conserve AGENCY',()=>assert.deepEqual(intersection('GLOBAL','AGENCY'),{sql:'(1=1) AND (x.agency_id=?)',params:['7']}));
test('RBAC02-03 AGENCY x GLOBAL conserve AGENCY',()=>assert.deepEqual(intersection('AGENCY','GLOBAL'),{sql:'(x.agency_id=?) AND (1=1)',params:['7']}));
test('RBAC02-04 CONCESSION x AGENCY cumule réellement les deux prédicats',()=>{const value=intersection('CONCESSION','AGENCY')!;assert.match(value.sql,/concession_id/);assert.match(value.sql,/x\.agency_id=\?/);assert.deepEqual(value.params,['7','7'])});
test('RBAC02-05 AGENCY x CONCESSION cumule réellement les deux prédicats',()=>{const value=intersection('AGENCY','CONCESSION')!;assert.match(value.sql,/x\.agency_id=\?/);assert.match(value.sql,/concession_id/);assert.deepEqual(value.params,['7','7'])});
test('RBAC02-06 OWN x GLOBAL conserve agence et propriétaire',()=>assert.deepEqual(intersection('OWN','GLOBAL'),{sql:'(x.agency_id=? AND x.owner_id=?) AND (1=1)',params:['7','42']}));
test('RBAC02-07 GLOBAL x OWN conserve agence et propriétaire',()=>assert.deepEqual(intersection('GLOBAL','OWN'),{sql:'(1=1) AND (x.agency_id=? AND x.owner_id=?)',params:['7','42']}));
test('RBAC02-08 deux agences différentes restent séparées',()=>assert.deepEqual(permissionScopePredicate(request('AGENCY'),'primary',{agency:'resource.agency_id'}),{sql:'resource.agency_id=?',params:['7']}));
test('RBAC02-09 CONCESSION est exprimé par la relation canonique agencies.concession_id',()=>assert.match(permissionScopePredicate(request('CONCESSION'),'primary',{agency:'resource.agency_id'})!.sql,/agencies WHERE concession_id=.*agencies WHERE id=\?/));
test('RBAC02-10 un rôle dynamique est gouverné uniquement par sa map de permissions',()=>assert.deepEqual(intersection('GLOBAL','AGENCY')?.params,['7']));
test('RBAC02-11 un faux SUPER_ADMIN sans permission ne bénéficie d’aucun bypass',()=>{const context=request() as any;context.rbac.roleCode='SUPER_ADMIN';context.rbac.isSuperAdmin=true;assert.equal(permissionScopePredicate(context,'primary',{agency:'x.agency_id'}),null)});
test('RBAC02-12 une permission secondaire absente rend la section inaccessible',()=>assert.equal(intersection('GLOBAL'),null));

test('RBAC02 les six périmètres composites emploient des prédicats de permission secondaires',()=>{
  const source=(module:string)=>readFileSync(new URL(`../src/modules/${module}`,import.meta.url),'utf8');
  assert.match(source('dashboard/dashboard.routes.ts'),/intersectScopePredicates/);
  assert.match(source('customers/customer.routes.ts'),/permissionScopePredicate/);
  assert.match(source('vehicles/vehicle.routes.ts'),/permissionScopePredicate/);
  assert.match(source('sales/sale.service.ts'),/permissionScopePredicate/);
  assert.match(source('billing/billing.routes.ts'),/permissionScopePredicate/);
  assert.match(source('parts/part.routes.ts'),/assertAgencyScope/);
});
