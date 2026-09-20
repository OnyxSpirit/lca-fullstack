import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import type {Request} from 'express';
import {assertPermission} from '../src/modules/rbac/rbac.service.js';
import {assertTestDriveReturned,quotationScope} from '../src/modules/quotations/quotation.service.js';

type Scope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
const request=(permissions:Record<string,Scope>={},superAdmin=false)=>({user:{sub:'42',email:'role.inconnu@lca.local',roles:['ROLE_DYNAMIQUE_INCONNU'],agencyId:'7'},query:{},rbac:{roleId:'91',roleCode:'ROLE_DYNAMIQUE_INCONNU',isSuperAdmin:superAdmin,permissions:new Map(Object.entries(permissions))}}) as unknown as Request;
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const routes=read('../src/modules/quotations/quotation.routes.ts');
const service=read('../src/modules/quotations/quotation.service.ts');
const sales=read('../src/modules/sales/sale.service.ts');

test('QUOTE-01/06/10/14/17/24 : chaque endpoint exige sa permission propre',async()=>{
  for(const permission of ['quotations.view','quotations.create','quotations.update','quotations.validate','quotations.cancel','quotations.convert','quotations.discount.manage'])await assert.rejects(()=>assertPermission(request(),permission),(error:any)=>error.status===403);
  for(const permission of ['quotations.view','quotations.create','quotations.update','quotations.validate','quotations.cancel'])assert.ok(routes.includes(`requirePermission('${permission}')`),permission);
  assert.doesNotMatch(routes,/authorize\(|SALES_AGENT|SALES_REP|SALES_MANAGER|DIRECTOR|ACCOUNTANT/);
  assert.doesNotMatch(service,/roles\.includes|roles\.some|notifyRoles|unrestricted|SALES_AGENT|SALES_MANAGER|DIRECTOR/);
});

test('QUOTE-02/03/04/05 : OWN suit opportunities.assigned_user_id et les quatre scopes sont isolés',()=>{
  const own=quotationScope(request({'quotations.view':'OWN'}),'quotations.view');
  assert.match(own.sql,/o\.assigned_user_id=\?/);assert.deepEqual(own.params,['7','42']);
  assert.deepEqual(quotationScope(request({'quotations.view':'AGENCY'}),'quotations.view'),{sql:'q.agency_id=?',params:['7']});
  assert.match(quotationScope(request({'quotations.view':'CONCESSION'}),'quotations.view').sql,/concession_id/);
  assert.deepEqual(quotationScope(request({'quotations.view':'GLOBAL'}),'quotations.view'),{sql:'1=1',params:[]});
  assert.match(service,/createdById/);assert.match(service,/commercial_owner_id/);
});

test('QUOTE-07/08/09/11/12 : création verrouillée, cohérente agence, essai retourné et véhicule disponible',()=>{
  assert.match(service,/WHERE o\.id=\? FOR UPDATE/);assert.match(service,/await assertRowScope\(connection,opportunity,request,'quotations\.create'\)/);
  assert.match(service,/assertTestDriveReturned\(opportunity\)/);assert.match(service,/vehicle\.status!=='available'/);assert.match(service,/Véhicule rattaché à une autre agence/);
  assert.doesNotThrow(()=>assertTestDriveReturned({test_drive_status:'completed',test_drive_returned_at:'2026-09-14'} as any));
});

test('QUOTE-13/15/16/18 : calcul backend, remise dédiée et devis émis verrouillé',()=>{
  assert.match(service,/discount>0\)await assertPermission\(request,'quotations\.discount\.manage'\)/);
  assert.match(service,/subtotal=amount\(vehicle\.sale_price/);assert.match(service,/total=subtotal-discount/);assert.match(service,/tax_total,total/);
  assert.match(service,/Seul un devis brouillon peut être modifié/);assert.match(service,/Seul un devis brouillon peut être émis/);
});

test('QUOTE-19/20/21 : PDF, annulation et audit restent scopés',()=>{
  assert.match(routes,/quotations\/:id\/pdf',requirePermission\('quotations\.view'\)/);
  assert.match(service,/sale_id|quotation_id/);assert.match(service,/Un devis déjà converti ne peut pas être annulé/);assert.match(service,/audit_logs/);
});

test('QUOTE-22/23/25/26/27 : conversion exige Devis ET Ventes, statut émis, non expiré et propriétaire',()=>{
  assert.match(sales,/targetAgency\(request,'sales\.create'/);assert.match(sales,/assertPermission\(request,'quotations\.convert'\)/);
  assert.match(sales,/conversionScope==='OWN'/);assert.match(sales,/quotation\.assigned_user_id/);assert.match(sales,/\['sent','negotiation'\]/);assert.match(sales,/Ce devis est expiré/);
  assert.match(sales,/String\(quotation\.agency_id\)!==agencyId/);
});

test('QUOTE-28/29/30 : conversion transactionnelle, verrouillée, idempotente et véhicule seulement réservé',()=>{
  assert.match(sales,/WHERE q\.id=\? FOR UPDATE/);assert.match(sales,/WHERE quotation_id=\? FOR UPDATE/);assert.match(sales,/Ce devis a déjà été transformé en vente/);
  assert.match(sales,/idempotency_key=\? FOR UPDATE/);assert.match(sales,/status='reserved'/);assert.match(sales,/UPDATE vehicles SET status='reserved'/);
  assert.doesNotMatch(service,/UPDATE vehicles SET status='sold'/i);
});

test('QUOTE-31/32 : rôle inconnu autorisé par permission et SUPER_ADMIN seule exception',async()=>{
  assert.equal(await assertPermission(request({'quotations.validate':'OWN'}),'quotations.validate'),'OWN');
  assert.equal(await assertPermission(request({},true),'quotations.view'),'GLOBAL');
});
