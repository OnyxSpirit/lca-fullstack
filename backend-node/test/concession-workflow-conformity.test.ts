import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {applyPayment} from '../src/modules/billing/payment.domain.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('PAY-01..06 cumuls, solde et surpaiement restent cohérents',()=>{
  const first=applyPayment(0,13_000_000,5_000_000);
  assert.deepEqual(first,{paid:5_000_000,balance:8_000_000,status:'partially_paid'});
  const second=applyPayment(first.paid,first.balance,3_000_000);
  assert.deepEqual(second,{paid:8_000_000,balance:5_000_000,status:'partially_paid'});
  assert.deepEqual(applyPayment(second.paid,second.balance,5_000_000),{paid:13_000_000,balance:0,status:'paid'});
  assert.throws(()=>applyPayment(8_000_000,5_000_000,5_000_001),error=>Boolean(error&&typeof error==='object'&&'status'in error&&error.status===409));
});

test('PAY-DOUBLE la transaction verrouille la facture avant de relire la clé idempotente',()=>{
  const route=read('../src/modules/billing/billing.routes.ts');
  const payment=route.slice(route.indexOf("post('/invoices/:id/payments'"),route.indexOf("post('/invoices/:id/credit-notes'"));
  assert.ok(payment.indexOf('access(invoiceId,r,c,true)')<payment.indexOf('WHERE idempotency_key=?'));
  assert.match(payment,/invoice_id.*idempotency_key/);
  assert.match(payment,/SELECT status FROM sales WHERE id=\? FOR UPDATE/);
  assert.match(read('../../backend/database/schema.sql'),/UNIQUE KEY uk_payment_idempotency \(idempotency_key\)/);
});

test('DEL-01..05 validation finale: facture, solde, rôle et livraison dédiée',()=>{
  const service=read('../src/modules/sales/sale.service.ts');
  assert.match(service,/status==='ready_for_delivery'/);
  assert.match(service,/\['SUPER_ADMIN','DIRECTOR','SALES_MANAGER'\]/);
  assert.match(service,/Une facture active est requise/);
  assert.match(service,/entièrement réglée/);
  assert.match(service,/status==='delivered'.*module Livraisons/);
});

test('CANCEL-01..05 annulation contrôlée et historisée',()=>{
  const service=read('../src/modules/sales/sale.service.ts');
  assert.match(service,/status==='cancelled'/);
  assert.match(service,/amount_paid/);
  assert.match(service,/livraison est planifiée/);
  assert.match(service,/ready_for_delivery','delivered/);
  assert.match(service,/sale\.cancelled/);
});

test('VEH-SOLD-01..08 stock historique et écritures commerciales protégées',()=>{
  const vehicles=read('../src/modules/vehicles/vehicle.routes.ts');
  const sales=read('../src/modules/sales/sale.service.ts');
  const quotations=read('../src/modules/quotations/quotation.service.ts');
  const showroom=read('../src/modules/showroom/showroom.routes.ts');
  assert.match(vehicles,/view==='active'.*NOT IN\('sold','delivered'\)/s);
  assert.match(vehicles,/view==='sold'.*IN\('sold','delivered'\)/s);
  assert.match(sales,/vehicle\.status!=='available'/);
  assert.match(sales,/vehicles WHERE id=\? FOR UPDATE/);
  assert.match(quotations,/vehicle\.status!=='available'/);
  assert.equal((showroom.match(/vehicle\.status!=='available'/g)??[]).length,2);
});
