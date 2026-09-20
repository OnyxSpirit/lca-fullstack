import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import type { Request } from 'express';
import { customerScope } from '../src/modules/customers/customer.routes.js';
import { assertPermission } from '../src/modules/rbac/rbac.service.js';

const request=(scope:'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL',query:Record<string,string>={})=>({
  user:{sub:'7',email:'support@test.local',roles:['CUSTOMER_SUPPORT_TEST'],agencyId:'2'},
  query,
  rbac:{roleId:'44',roleCode:'CUSTOMER_SUPPORT_TEST',isSuperAdmin:false,permissions:new Map([['customers.view',scope],['customers.update',scope]])},
} as unknown as Request);

test('CLIENT-02 OWN repose sur customers.assigned_user_id',()=>{
  const value=customerScope(request('OWN'),'customers.view');
  assert.equal(value.sql,'c.assigned_user_id=?');assert.deepEqual(value.params,['7']);
});
test('CLIENT-03 AGENCY filtre réellement agency_id',()=>assert.match(customerScope(request('AGENCY'),'customers.view').sql,/c\.agency_id=\?/));
test('CLIENT-04 CONCESSION utilise la concession de l’agence courante',()=>assert.match(customerScope(request('CONCESSION'),'customers.view').sql,/concession_id/));
test('CLIENT-05 GLOBAL ne restreint pas la ressource',()=>assert.equal(customerScope(request('GLOBAL'),'customers.view').sql,'1=1'));
test('CLIENT-08 update OWN utilise le propriétaire métier',()=>assert.equal(customerScope(request('OWN'),'customers.update').sql,'c.assigned_user_id=?'));
test('CLIENT-09 une recherche commerciale hors OWN est refusée',()=>assert.throws(()=>customerScope(request('OWN',{commercialId:'8'}),'customers.view','c',true),/portefeuille/));
test('CLIENT-01 sans customers.view l’accès est refusé',async()=>{
  const denied=request('OWN');denied.rbac!.permissions.delete('customers.view');
  await assert.rejects(()=>assertPermission(denied,'customers.view'),/Permission insuffisante/);
});
test('CLIENT-06 sans customers.create la création est refusée',async()=>await assert.rejects(()=>assertPermission(request('OWN'),'customers.create'),/Permission insuffisante/));
test('CLIENT-07 sans customers.update la modification est refusée',async()=>{const denied=request('OWN');denied.rbac!.permissions.delete('customers.update');await assert.rejects(()=>assertPermission(denied,'customers.update'),/Permission insuffisante/);});
test('CLIENT-10 une fiche hors scope n’est pas sélectionnable par le SQL',()=>assert.match(customerScope(request('OWN'),'customers.view').sql,/assigned_user_id/));
test('CLIENT-11/12 aucun rôle historique ne gouverne le runtime Clients',async()=>{
  const source=await readFile(new URL('../src/modules/customers/customer.routes.ts',import.meta.url),'utf8');
  for(const token of ['authorize(','SALES_MANAGER','SALES_REP','DIRECTOR','DIRECTION','RECEPTIONIST','SERVICE_ADVISOR','ACCOUNTANT','roles.includes','roles.some','hasRole'])assert.equal(source.includes(token),false,token);
  assert.match(source,/requirePermission\('customers\.view'\)/);assert.match(source,/requirePermission\('customers\.create'\)/);assert.match(source,/requirePermission\('customers\.update'\)/);
});
test('CLIENT-21 les sous-données 360 sont conditionnées par leurs permissions sources',async()=>{
  const source=await readFile(new URL('../src/modules/customers/customer.routes.ts',import.meta.url),'utf8');
  for(const permission of ['crm.prospect.view','vehicles.view','sales.view','quotations.view','service.order.view','billing.invoice.view','billing.payment.view'])assert.match(source,new RegExp(`can\\(context,'${permission.replaceAll('.','\\.')}'\\)`));
});
test('CLIENT-13 seul le SUPER_ADMIN système bénéficie du bypass',async()=>{
  const superRequest=request('OWN');superRequest.rbac={roleId:'1',roleCode:'SUPER_ADMIN',isSuperAdmin:true,permissions:new Map()};
  assert.equal(await assertPermission(superRequest,'customers.view'),'GLOBAL');
  const director=request('OWN');director.rbac={roleId:'2',roleCode:'DIRECTOR',isSuperAdmin:false,permissions:new Map()};
  await assert.rejects(()=>assertPermission(director,'customers.view'),/Permission insuffisante/);
});
