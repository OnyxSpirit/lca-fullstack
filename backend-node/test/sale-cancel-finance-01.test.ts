import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const sales=read('../src/modules/sales/sale.service.ts'),routes=read('../src/modules/sales/sale.routes.ts'),billing=read('../src/modules/billing/billing.routes.ts'),cancel=read('../src/modules/billing/invoice-cancellation.service.ts'),schema=read('../database/baseline/001_initial_schema.sql');

test('SCF-01/02/03/16/17 conserve l’annulation transactionnelle sans paiement',()=>{
 assert.match(sales,/transaction\(async connection=>/);assert.match(sales,/for\(const invoice of invoices\)await cancelUnpaidInvoice/);
 assert.match(sales,/status==='cancelled'.*nextVehicleStatus='available'/);assert.match(sales,/UPDATE sales SET status=/);assert.match(sales,/UPDATE reservations SET status='cancelled'/);
});

test('SCF-04/05/06/07/22/23/24 bloque tout encaissement net avant mutation',()=>{
 const guard=sales.indexOf('Une vente ayant reçu un paiement ne peut plus être annulée'),saleUpdate=sales.indexOf('UPDATE sales SET status=?');
 assert.ok(guard>0&&guard<saleUpdate);assert.match(routes,/status===['"]cancelled['"]\?['"]sales\.cancel['"]/);
 assert.doesNotMatch(sales.slice(sales.indexOf('export async function updateStatus')),/isSuperAdmin/);
 assert.doesNotMatch(sales,/DELETE FROM (payments|invoices)/);
});

test('SCF-10/11/12 exige zéro encaissé net même après avoir ou remboursement partiel',()=>{
 assert.match(sales,/invoices\.reduce\(\(sum,row\)=>sum\+Number\(row\.amount_paid\?\?0\),0\)>\.001/);
 assert.match(cancel,/Number\(payment\.amount\)-Number\(payment\.refunded_amount\)>\.001/);
 assert.doesNotMatch(billing.slice(billing.indexOf("credit-notes'"),billing.indexOf("payments/:id/refund")),/UPDATE vehicles|UPDATE sales SET status/);
});

test('SCF-13/14/15/18/19/20 recalcule sans suppression ni annulation automatique',()=>{
 assert.match(billing,/const paid=Math\.max\(0,Number\(x\.paid\)\)/);assert.match(billing,/UPDATE sales SET deposit_amount=\?,balance_due=\?/);
 assert.match(schema,/CREATE TABLE payment_refunds/);assert.match(schema,/CREATE TABLE credit_notes/);assert.match(schema,/CREATE TABLE payments/);
 assert.doesNotMatch(billing.slice(billing.indexOf("payments/:id/refund")),/DELETE FROM|UPDATE vehicles SET status|UPDATE sales SET status='cancelled'/);
});

test('SCF-25/26/27 protège double remboursement et sur-remboursement',()=>{
 assert.match(billing,/payment_refunds WHERE idempotency_key=\? FOR UPDATE/);assert.match(schema,/UNIQUE KEY uk_payment_refund_idempotency/);
 assert.match(billing,/amount>paymentRemaining\+\.001/);assert.match(billing,/amount>creditRemaining\+\.001/);
});

test('SCF-28 refuse un paiement après annulation Vente',()=>{
 assert.match(billing,/linkedSale\.status===['"]cancelled['"]/);assert.match(billing,/La vente associée est annulée et ne peut plus recevoir de paiement/);
});

test('SCF-29/30 conserve livraison et atomicité',()=>{
 assert.match(sales,/deliveries WHERE sale_id=\? AND status<>['"]cancelled['"].*FOR UPDATE/);
 assert.match(sales,/Une vente dont la livraison est planifiée ne peut plus être annulée/);
 assert.ok(sales.indexOf('Une vente dont la livraison est planifiée')<sales.indexOf('UPDATE sales SET status=?'));
});
