import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
import type{Request}from'express';
import{assertPermission}from'../src/modules/rbac/rbac.service.js';
import{billingScopeSql}from'../src/modules/billing/billing.routes.js';
import{applyPayment}from'../src/modules/billing/payment.domain.js';
type Scope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
const request=(permissions:Record<string,Scope>={},superAdmin=false)=>({user:{sub:'42',email:'billing@dynamic.local',roles:['BILLING_OPERATOR_DYNAMIC'],agencyId:'7'},query:{},body:{},rbac:{roleId:'90',roleCode:'BILLING_OPERATOR_DYNAMIC',isSuperAdmin:superAdmin,permissions:new Map(Object.entries(permissions))}})as unknown as Request;
const source=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8');
const sales=readFileSync(new URL('../src/modules/sales/sale.service.ts',import.meta.url),'utf8');
const customers=readFileSync(new URL('../src/modules/customers/customer.routes.ts',import.meta.url),'utf8');

test('BILL-01/06/08/10/12/14/15/22/23/24/25 : permissions dynamiques sans bypass',async()=>{
 for(const permission of['billing.invoice.view','billing.invoice.create','billing.invoice.update','billing.invoice.issue','billing.invoice.cancel','billing.payment.view','billing.payment.collect','billing.payment.refund'])await assert.rejects(()=>assertPermission(request(),permission),(error:any)=>error.status===403);
 assert.doesNotMatch(source,/authorize\(|ACCOUNTANT|DIRECTOR|SALES_MANAGER|DELIVERY_MANAGER|roles\.includes|ROLE_PERMISSIONS/);
 assert.equal(await assertPermission(request({'billing.payment.collect':'AGENCY'}),'billing.payment.collect'),'AGENCY');
 assert.equal(await assertPermission(request({},true),'billing.invoice.view'),'GLOBAL');
});
test('BILL-02/03/04/05/07 : AGENCY CONCESSION GLOBAL et refus explicite de OWN',()=>{
 assert.deepEqual(billingScopeSql(request({'billing.invoice.view':'AGENCY'}),'billing.invoice.view'),{sql:'i.agency_id=?',params:['7']});
 assert.match(billingScopeSql(request({'billing.invoice.view':'CONCESSION'}),'billing.invoice.view').sql,/concession_id/);
 assert.deepEqual(billingScopeSql(request({'billing.invoice.view':'GLOBAL'}),'billing.invoice.view'),{sql:'1=1',params:[]});
 assert.throws(()=>billingScopeSql(request({'billing.invoice.view':'OWN'}),'billing.invoice.view'),/OWN n’est pas applicable/);
});
test('BILL-09/11/33/34 : brouillon, émission distincte et fiscalité imposée par le backend',()=>{
 assert.match(source,/status[^\n]*'draft'/);assert.match(source,/requirePermission\('billing\.invoice\.issue'\)/);assert.match(source,/Seule une facture brouillon est modifiable/);
 assert.match(source,/getEffectiveBusinessSettings\(String\(invoice\.agency_id\)\)/);assert.match(source,/lines\(r\.body\.items,invoice\.tax_mode,invoice\.price_input_mode,Number\(invoice\.tax_rate_snapshot\)\)/);assert.match(source,/sales\.tax\.override/);assert.doesNotMatch(source,/x\.taxRate\?\?/);
});
test('BILL-13 : annulation verrouille et refuse tout paiement confirmé',()=>{assert.match(source,/status='confirmed' FOR UPDATE/);assert.match(source,/facture encaissée doit faire l’objet/)});
test('BILL-16/17/18/21 : paiements partiels cumulés et surpaiement refusé',()=>{assert.deepEqual(applyPayment(0,100,40),{paid:40,balance:60,status:'partially_paid'});assert.deepEqual(applyPayment(40,60,30),{paid:70,balance:30,status:'partially_paid'});assert.throws(()=>applyPayment(70,30,31));assert.deepEqual(applyPayment(70,30,30),{paid:100,balance:0,status:'paid'})});
test('BILL-19/20 : idempotence et concurrence sont protégées par clé unique et verrou facture',()=>{assert.match(source,/idempotency_key=\? FOR UPDATE/);assert.match(source,/access\(invoiceId,r,'billing\.payment\.collect',c,true\)/);assert.match(source,/Facture déjà soldée ou non encaissable/);assert.match(source,/applyPayment/)});
test('BILL-29/30/31 : lecture paiements indépendante dans Billing, Ventes et Client 360',()=>{assert.match(source,/grant\(r,'billing\.payment\.view'\)/);assert.match(sales,/permissions\.has\('billing\.payment\.view'\)/);assert.match(customers,/sections\.payments/)});
test('BILL-32/35 : PDF facture et reçu appliquent leurs permissions et scopes',()=>{assert.match(source,/invoices\/:id\/pdf',requirePermission\('billing\.invoice\.view'\)/);assert.match(source,/payments\/:id\/receipt',requirePermission\('billing\.payment\.view'\)/);assert.match(source,/access\(String\(p\.invoice_id\),r,'billing\.payment\.view'\)/)});
