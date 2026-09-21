import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{cancelUnpaidInvoice}from'../src/modules/billing/invoice-cancellation.service.js';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8'),sales=read('src/modules/sales/sale.service.ts'),billing=read('src/modules/billing/billing.routes.ts'),hooks=read('../frontend/src/api/erpHooks.ts');

test('VENTE-ANNULATION-02 neutralise chaque facture active dans la transaction Vente',()=>{
 assert.match(sales,/SELECT id,amount_paid FROM invoices WHERE sale_id=\? AND status<>'cancelled' FOR UPDATE/);
 assert.match(sales,/for\(const invoice of invoices\)await cancelUnpaidInvoice/);
 assert.ok(sales.indexOf('cancelUnpaidInvoice')<sales.indexOf("UPDATE sales SET status=?"));
 assert.match(sales,/UPDATE vehicles SET status=\? WHERE id=\? AND status=\?/);
 assert.match(sales,/UPDATE reservations SET status='cancelled'/);
});

test('VENTE-ANNULATION-02 refuse de facturer une vente annulée sous verrou',()=>{
 const creation=billing.slice(billing.indexOf("post('/invoices'"),billing.indexOf("patch('/invoices/:id'"));
 assert.match(creation,/SELECT id,customer_id,agency_id,status,total.*FROM sales WHERE id=\? FOR UPDATE/);
 assert.match(creation,/status==='cancelled'.*Une vente annulée ne peut pas être facturée/);
});

test('VENTE-ANNULATION-02 aligne paiement et annulation sur verrou Vente puis Facture',()=>{
 const payment=billing.slice(billing.indexOf("post('/invoices/:id/payments'"),billing.indexOf("post('/invoices/:id/credit-notes'"));
 assert.ok(payment.indexOf('SELECT status FROM sales WHERE id=? FOR UPDATE')<payment.indexOf("access(invoiceId,r,'billing.payment.collect',c,true)"));
});

test('VENTE-ANNULATION-02 conserve une seule primitive de neutralisation Billing',()=>{
 const cancellation=billing.slice(billing.indexOf("post('/invoices/:id/cancel'"),billing.indexOf("get('/invoices/:id/payments'"));
 assert.match(cancellation,/cancelUnpaidInvoice/);
 assert.doesNotMatch(cancellation,/UPDATE invoices SET status='cancelled'/);
});

test('VENTE-ANNULATION-02 recharge Vente, véhicule et facture après succès',()=>{
 const mutation=hooks.slice(hooks.indexOf('export function useSaleStatusMutation'),hooks.indexOf('export function useUpdateSale'));
 for(const key of['erpKeys.sales','erpKeys.vehicles','erpKeys.invoices'])assert.match(mutation,new RegExp(key.replace('.','\\.')));
});

test('VENTE-ANNULATION-02 refuse une facture avec paiement confirmé sans mutation',async()=>{
 const statements:string[]=[];
 const connection={execute:async(sql:string)=>{statements.push(sql);if(sql.startsWith('SELECT id,status'))return[[{id:1,status:'partially_paid',amount_paid:5_000_000}],[]];if(sql.includes('FROM payments p'))return[[{id:1,amount:5_000_000,refunded_amount:0}],[]];throw new Error('mutation inattendue')}};
 await assert.rejects(()=>cancelUnpaidInvoice(connection as never,'1','Annulation',{userId:'1',ip:null,userAgent:null}),(error:any)=>error.status===409);
 assert.equal(statements.some(sql=>sql.startsWith('UPDATE')),false);
});
