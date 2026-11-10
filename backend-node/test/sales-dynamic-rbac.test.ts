import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Request } from 'express';
import { assertAgencyBusinessPermission } from '../src/modules/rbac/agency-authorization.js';
import { saleScope } from '../src/modules/sales/sale.service.js';
import { assertSaleTransition } from '../src/modules/sales/sale.domain.js';

type Scope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
const request=(permissions:Record<string,Scope>={},superAdmin=false)=>({user:{sub:'42',sid:'session-1',email:'dynamic@lca.local',roles:['SALES_DYNAMIC_TEST'],agencyId:'7'},query:{},agencyRbac:{userId:'42',sessionId:'session-1',activeAgencyId:'7',contextVersion:1,isSuperAdmin:superAdmin,permissions:new Map(Object.entries(permissions))}}) as unknown as Request;
const routes=readFileSync(new URL('../src/modules/sales/sale.routes.ts',import.meta.url),'utf8');
const service=readFileSync(new URL('../src/modules/sales/sale.service.ts',import.meta.url),'utf8');

test('SALE-01/06/10/12/16/21/28 : permissions absentes refusées sans bypass de rôle',async()=>{
  for(const permission of ['sales.view','sales.create','sales.update','sales.confirm','sales.cancel'])await assert.rejects(()=>assertAgencyBusinessPermission(request(),permission),(error:any)=>error.status===403);
  assert.doesNotMatch(routes,/authorize\(|SALES_AGENT|SALES_MANAGER|DIRECTOR|ACCOUNTANT/);
  assert.doesNotMatch(service,/roles\.includes|roles\.some|notifyRoles|unrestricted|SALES_AGENT|SALES_MANAGER|DIRECTOR/);
});

test('SALE-02/03/04/05 : seuls OWN et AGENCY sont admis et restent liés à l’agence active',()=>{
  const own=saleScope(request({'sales.view':'OWN'}),'sales.view');assert.match(own.sql,/salesperson_id=\?/);assert.deepEqual(own.params,['7','42']);
  assert.deepEqual(saleScope(request({'sales.view':'AGENCY'}),'sales.view'),{sql:'s.agency_id=?',params:['7']});
  assert.throws(()=>saleScope(request({'sales.view':'CONCESSION'}),'sales.view'),/OWN\/AGENCY/);
  assert.throws(()=>saleScope(request({'sales.view':'GLOBAL'}),'sales.view'),/OWN\/AGENCY/);
});

test('SALE-11/20/22/27 : chaque opération emploie son scope et un rôle dynamique fonctionne',async()=>{
  assert.match(service,/one\(saleId,request,'sales\.update'\)/);assert.match(service,/saleScope\(request,permission\)/);
  assert.equal(await assertAgencyBusinessPermission(request({'sales.update':'OWN'}),'sales.update'),'OWN');
  await assert.rejects(()=>assertAgencyBusinessPermission(request({},true),'sales.view'),/Permission agence insuffisante/);
});

test('SALE-RBAC-TRANSACTION : les mutations revalident le contexte agence frais sous transaction',()=>{
  assert.match(routes,/requireAgencyBusinessPermission\('sales\.create'\)/);
  assert.match(routes,/requireAnyAgencyBusinessPermission\(\['sales\.confirm','sales\.cancel'\]\)/);
  assert.match(service,/withCurrentAgencyBusinessAuthorizationRetry\(request,'sales\.create'/);
  assert.match(service,/withCurrentAgencyBusinessAuthorization\(request,'sales\.update'/);
  assert.match(service,/withCurrentAgencyBusinessAuthorization\(request,permission/);
  assert.match(service,/assertAgencyBusinessPermissionInContext\(context,'sales\.assign'\)/);
  assert.match(service,/JOIN user_agencies ua ON ua\.user_id=u\.id AND ua\.agency_id=\?/);
  assert.match(service,/JOIN user_agency_roles uar ON uar\.user_agency_id=ua\.id/);
  assert.doesNotMatch(routes,/requirePermission\(/);
  assert.doesNotMatch(service,/assertPermission\(/);
});

test('SALE-09/13/14/15 : confirmation verrouille vente et véhicule, SOLD vient de confirmed',()=>{
  assert.match(service,/WHERE s\.id=\? AND \$\{scoped\.sql\} FOR UPDATE/);
  assert.match(service,/SELECT id,agency_id,status,archived_at,is_commercial_stock,vin,stock_number,catalog_price,sale_price[^']* FROM vehicles WHERE id=\? FOR UPDATE/);
  assert.match(service,/status==='confirmed'/);assert.match(service,/nextVehicleStatus='sold'/);
  assert.match(service,/UPDATE vehicles SET status=\? WHERE id=\? AND status=\?/);
  assert.doesNotThrow(()=>assertSaleTransition('ordered','confirmed'));
  assert.throws(()=>assertSaleTransition('delivered','confirmed'));
});

test('SALE-17/18/19 : annulation exige motif et refuse paiement ou livraison',()=>{
  assert.match(service,/motif d’annulation est obligatoire/);assert.match(service,/amount_paid/);assert.match(service,/livraison est planifiée/);assert.match(service,/prête à livrer ou livrée/);assert.match(service,/nextVehicleStatus='available'/);
});

test('SALE-07/08 : client et véhicule sont verrouillés et rattachés à l’agence de la vente',()=>{
  assert.match(service,/SELECT id,agency_id FROM customers WHERE id=\? FOR UPDATE/);assert.match(service,/Client hors périmètre/);assert.match(service,/Véhicule hors périmètre/);
});

test('SALE-29/30 : paiement et livraison conservent leurs permissions dédiées',()=>{
  assert.doesNotMatch(routes,/billing\.payment/);assert.match(service,/delivery\.view/);assert.doesNotMatch(service,/UPDATE deliveries/);
});
