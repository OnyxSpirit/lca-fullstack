import assert from'node:assert/strict';
import{mock,test}from'node:test';
import*as fs from'node:fs/promises';

test('LOT3B archive facture/reçu : reprise idempotente et concurrente sans rejeu financier',async()=>{
 const documents=new Map<string,{id:string;file_url:string;file_hash:string}>(),files=new Map<string,Buffer>();
 const invoice={id:'17',invoice_number:'FAC-IMMUTABLE',agency_id:'2',status:'paid',total:1_500_000,amount_paid:1_500_000,balance_due:0};
 const payment={id:'27',invoice_id:'17',payment_number:'REG-IMMUTABLE',status:'confirmed',amount:1_500_000,payment_date:'2026-10-22',reference:'REC-B31',invoice_number:'FAC-IMMUTABLE',agency_id:'2',currency_code:'XAF',payment_method:'Virement',received_by_name:'Recette',customer_name:'Client recette'};
 let sequence=0,renderInvoiceCount=0,renderReceiptCount=0,financialWrites=0,failInvoiceRender=false,failReceiptRender=false,failInsert=false;
 mock.module('node:fs/promises',{namedExports:{...fs,unlink:async(path:string)=>{files.delete(path);}}});
 mock.module('../src/config/database.js',{namedExports:{
  execute:async()=>({}),
  query:async(sql:string,params:unknown[]=[])=>{
   if(sql.includes('FROM invoices WHERE'))return[invoice];
   if(sql.includes('FROM payments p JOIN invoices'))return[payment];
   if(sql.includes('document_mark_policies'))return[];
   if(sql.includes('FROM documents')){const row=documents.get(String(params[0]));return row?[row]:[];}
   return[];
  },
  transaction:async(job:any)=>job({execute:async(sql:string,params:unknown[]=[])=>{
   if(/INSERT INTO payments|UPDATE invoices|treasury_|account_movements/i.test(sql))financialWrites++;
   if(!sql.includes('INSERT INTO documents'))return[{affectedRows:1}];
   if(failInsert)throw new Error('insertion GED simulée');
   const sourceKey=String(params[1]);
   if(documents.has(sourceKey)){const error:any=new Error('doublon simulé');error.code='ER_DUP_ENTRY';throw error;}
   const id=String(documents.size+1),file_url=String(params[5]),file_hash=String(params[11]);documents.set(sourceKey,{id,file_url,file_hash});return[{insertId:Number(id)}];
  }}),
 }});
 mock.module('../src/realtime/socket.js',{namedExports:{emitToAgency:()=>undefined}});
 mock.module('../src/modules/documents/commercial-document.js',{namedExports:{
  renderDeliveryDocument:async()=>Buffer.alloc(0),renderQuotationDocument:async()=>Buffer.alloc(0),renderSaleOrderDocument:async()=>Buffer.alloc(0),
  renderInvoiceDocument:async()=>{renderInvoiceCount++;if(failInvoiceRender)throw new Error('rendu facture simulé');return Buffer.from(`%PDF-INVOICE-${renderInvoiceCount}`)},
  renderPaymentReceiptData:async()=>{renderReceiptCount++;if(failReceiptRender)throw new Error('rendu reçu simulé');return Buffer.from(`%PDF-RECEIPT-${renderReceiptCount}`)},
 }});
 mock.module('../src/modules/documents/document-storage.js',{namedExports:{
  documentHash:(buffer:Buffer)=>`hash-${buffer.toString()}`,
  inspectDocumentFile:async()=> 'AVAILABLE',readDocumentFile:async()=>Buffer.alloc(0),
  storeDocument:async(file:{buffer:Buffer})=>{const storageKey=`lot3b-${++sequence}.pdf`;files.set(storageKey,file.buffer);return{absolute:storageKey,storageKey};},
 }});
 mock.module('../src/modules/document-marks/document-mark-policy.service.js',{namedExports:{resolveDocumentMarks:async()=>null,snapshotResolvedMarks:async()=>undefined}});
 try{
  const{archiveInvoice,archivePayment}=await import(`../src/modules/documents/business-document.service.js?lot3b=${Date.now()}`);
  failInvoiceRender=true;await assert.rejects(()=>archiveInvoice('17',null),/rendu facture simulé/);failInvoiceRender=false;
  assert.equal(documents.size,0);assert.equal(files.size,0);assert.equal(invoice.status,'paid');
  failInsert=true;await assert.rejects(()=>archiveInvoice('17',null),/insertion GED simulée/);failInsert=false;
  assert.equal(documents.size,0);assert.equal(files.size,0,'le PDF orphelin est compensé après échec SQL');
  const invoices=await Promise.all([archiveInvoice('17',null),archiveInvoice('17',null)]);
  assert.deepEqual(invoices.map(x=>x.created).sort(),[false,true]);
  assert.equal(documents.has('invoice:17:issued:v2'),true);assert.equal(renderInvoiceCount,4);assert.equal(files.size,1);
  const invoiceRenders=renderInvoiceCount;assert.equal((await archiveInvoice('17',null)).created,false);assert.equal(renderInvoiceCount,invoiceRenders);

  failReceiptRender=true;await assert.rejects(()=>archivePayment('27',null),/rendu reçu simulé/);failReceiptRender=false;
  assert.equal(documents.size,1);assert.equal(files.size,1);assert.equal(payment.status,'confirmed');
  const receipts=await Promise.all([archivePayment('27',null),archivePayment('27',null)]);
  assert.deepEqual(receipts.map(x=>x.created).sort(),[false,true]);
  assert.equal(documents.has('payment:27:confirmed:v1'),true);assert.equal(renderReceiptCount,3);assert.equal(files.size,2);
  const receiptRenders=renderReceiptCount;assert.equal((await archivePayment('27',null)).created,false);assert.equal(renderReceiptCount,receiptRenders);

  assert.equal(financialWrites,0,'la reprise documentaire ne doit écrire ni paiement, ni facture, ni trésorerie');
  assert.deepEqual({status:invoice.status,total:invoice.total,paid:invoice.amount_paid,balance:invoice.balance_due},{status:'paid',total:1_500_000,paid:1_500_000,balance:0});
  assert.deepEqual({status:payment.status,amount:payment.amount,reference:payment.reference},{status:'confirmed',amount:1_500_000,reference:'REC-B31'});
 }finally{mock.restoreAll();}
});

test('LOT3B expose des reprises documentaires RBAC et refuse le rejeu métier',async()=>{
 const{readFileSync}=await import('node:fs');
 const source=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8');
 const invoiceRoute=source.slice(source.indexOf("billingRouter.post('/invoices/:id/archive'"),source.indexOf("billingRouter.post('/payments/:id/receipt/archive'"));
 const receiptRoute=source.slice(source.indexOf("billingRouter.post('/payments/:id/receipt/archive'"),source.indexOf("billingRouter.post('/invoices/:id/payments'"));
 assert.match(invoiceRoute,/requirePermission\('billing\.invoice\.issue'\)/);assert.match(invoiceRoute,/access\(invoiceId,r,'billing\.invoice\.issue'\)/);
 assert.match(receiptRoute,/requirePermission\('billing\.payment\.collect'\)/);assert.match(receiptRoute,/access\(String\(payment\.invoice_id\),r,'billing\.payment\.collect'\)/);
 for(const route of[invoiceRoute,receiptRoute]){
  assert.match(route,/before==='AVAILABLE'/);assert.match(route,/before!=='MISSING_RECORD'/);assert.match(route,/archive_retry_completed/);
  assert.doesNotMatch(route,/INSERT INTO payments|UPDATE invoices|postAutomaticMovement|notifyAccounting/);
 }
 assert.match(source,/receipt_archive_status/);assert.match(source,/archive_status:archiveStatus/);
});
