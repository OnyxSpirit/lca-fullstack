import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{assertActiveInvoiceFinancialClearance}from'../src/modules/billing/sale-financial-gate.js';

const denied=(invoice:any,gate:'preparation'|'ready_for_delivery'|'delivery')=>assert.throws(()=>assertActiveInvoiceFinancialClearance(invoice,gate),error=>Boolean(error&&typeof error==='object'&&'status'in error&&error.status===409));
const paid=(amount=33_000_000)=>({id:'1',status:'paid',amount_paid:amount,balance_due:0});
const sale=readFileSync(new URL('../src/modules/sales/sale.service.ts',import.meta.url),'utf8');
const delivery=readFileSync(new URL('../src/modules/deliveries/delivery.routes.ts',import.meta.url),'utf8');
const billing=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8');

test('FIN-FIX-01 confirmed sans facture refuse preparation',()=>denied(undefined,'preparation'));
test('FIN-FIX-02 facture draft refuse preparation',()=>denied({id:'1',status:'draft',amount_paid:0,balance_due:33_000_000},'preparation'));
test('FIN-FIX-03/04 soldes 33M et 23M refusent preparation',()=>{denied({id:'1',status:'issued',amount_paid:0,balance_due:33_000_000},'preparation');denied({id:'1',status:'partially_paid',amount_paid:10_000_000,balance_due:23_000_000},'preparation')});
test('FIN-FIX-05 facture payee autorise preparation',()=>assert.doesNotThrow(()=>assertActiveInvoiceFinancialClearance(paid(),'preparation')));
test('FIN-FIX-06 paiements fractionnes autorisent une fois le solde nul',()=>{denied({id:'1',status:'partially_paid',amount_paid:30_000_000,balance_due:3_000_000},'preparation');assert.doesNotThrow(()=>assertActiveInvoiceFinancialClearance(paid(),'preparation'))});
test('FIN-FIX-07 solde nul legitime par avoir suit le statut autoritaire paid',()=>assert.doesNotThrow(()=>assertActiveInvoiceFinancialClearance(paid(0),'preparation')));
test('FIN-FIX-08 appel direct est protege dans la transaction Vente',()=>{assert.match(sale,/status==='preparation'\)await lockActiveSaleInvoice\(connection,saleId,'preparation'\)/);assert.match(sale,/status==='ready_for_delivery'\)await lockActiveSaleInvoice/)});
test('FIN-FIX-09/10 planification exige dynamiquement une facture soldee',()=>{assert.match(delivery,/lockedSale\.status!=='ready_for_delivery'.*lockActiveSaleInvoice\(connection,saleId,'delivery'\)/s);assert.doesNotThrow(()=>assertActiveInvoiceFinancialClearance(paid(),'delivery'));denied({id:'1',status:'partially_paid',amount_paid:28_000_000,balance_due:5_000_000},'delivery')});
test('FIN-FIX-11 progression Livraison reverifie la finance',()=>{assert.match(delivery,/isForwardProgression.*SELECT id FROM sales WHERE id=\? FOR UPDATE.*lockActiveSaleInvoice/s)});
test('FIN-FIX-12 signature conserve la garde centralisee',()=>{const sign=delivery.slice(delivery.indexOf('"/deliveries/:id/sign"'),delivery.indexOf('"/deliveries/:id/pdf"'));assert.match(sign,/lockActiveSaleInvoice\(connection,String\(delivery\.sale_id\),'delivery'\)/)});
test('FIN-FIX-13 regularisation permet la reprise',()=>{denied({id:'1',status:'partially_paid',amount_paid:28_000_000,balance_due:5_000_000},'delivery');assert.doesNotThrow(()=>assertActiveInvoiceFinancialClearance(paid(),'delivery'))});
test('RACE-FIN-01/02/03 ordre Vente puis Facture conserve par transitions, planification, remboursement et signature',()=>{
  assert.match(sale,/SELECT s\.id,s\.status.*FOR UPDATE.*lockActiveSaleInvoice/s);
  assert.match(delivery,/lockedSales.*FOR UPDATE.*lockActiveSaleInvoice\(connection,saleId/s);
  assert.match(delivery,/SELECT d\.\*,s\.status sale_status.*FOR UPDATE.*lockActiveSaleInvoice\(connection,String\(delivery\.sale_id/s);
  assert.match(billing,/SELECT id FROM sales WHERE id=\? FOR UPDATE.*access\(String\(target\.invoice_id\),r,'billing\.payment\.refund',c,true\)/s);
});
