import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const route=read('../src/modules/billing/billing.routes.ts'),report=read('../src/modules/reports/report.routes.ts'),cancel=read('../src/modules/billing/invoice-cancellation.service.ts'),migration=read('../database/migrations/038_payment_refunds.sql');

test('AR-01..08 remboursement partiel central lié à un avoir et borné',()=>{
 assert.match(route,/creditNoteId=id\(r\.body\.creditNoteId\)/);
 assert.match(route,/amount=money\(r\.body\.amount,'Montant remboursement',\.01\)/);
 assert.match(route,/String\(credit\.invoice_id\)!==String\(invoice\.id\)/);
 assert.match(route,/amount>paymentRemaining\+\.001/);
 assert.match(route,/amount>creditRemaining\+\.001/);
 assert.match(route,/INSERT INTO payment_refunds\(payment_id,invoice_id,credit_note_id,amount,reason,refunded_by,idempotency_key\)/);
 assert.doesNotMatch(route,/UPDATE payments SET status='refunded'/);
});

test('AR-09..10 idempotence, transaction et ordre stable des verrous',()=>{
 assert.match(migration,/UNIQUE KEY uk_payment_refund_idempotency/);
 assert.match(route,/payment_refunds WHERE idempotency_key=\? FOR UPDATE/);
 const refund=route.slice(route.indexOf("post('/payments/:id/refund'"),route.indexOf("get('/invoices/:id/pdf'"));
 assert.ok(refund.indexOf("access(String(target.invoice_id),r,'billing.payment.refund',c,true)")<refund.indexOf('FROM credit_notes'));
 assert.ok(refund.indexOf('FROM credit_notes')<refund.indexOf('FROM payments p WHERE p.id=? FOR UPDATE'));
});

test('AR-11..15 RBAC et scopes financiers restent centraux',()=>{
 assert.match(route,/requirePermission\('billing\.payment\.refund'\)/);
 assert.match(route,/scope==='OWN'.*403/s);
 for(const scope of['AGENCY','CONCESSION','GLOBAL'])assert.match(route,new RegExp(`scope==='${scope}'`));
});

test('AR-16..23 recalcul, reporting, journal et legacy coexistent sans double comptage',()=>{
 assert.match(route,/net=Math\.max\(0,Number\(x\.total\)-Number\(x\.credited\)\)/);
 assert.match(route,/balance=Math\.max\(0,net-paid\)/);
 assert.match(route,/UPDATE sales SET deposit_amount=\?,balance_due=\?/);
 assert.match(report,/payment_refunds/);assert.match(report,/p\.status='refunded'/);
 assert.match(route,/for\(const x of refunds\)rows\.push\(\['BANQUE'/);
 assert.match(cancel,/refunded_amount/);
 assert.doesNotMatch(migration,/^\s*(DROP|TRUNCATE|DELETE)\b/im);
});

test('AR-24 migration additive et traçabilité complète',()=>{
 for(const value of['payment_id','invoice_id','credit_note_id','amount','reason','refunded_at','refunded_by','idempotency_key','created_at'])assert.match(migration,new RegExp(value));
 assert.match(route,/audit\(c,r,'payment_refund'/);
});
