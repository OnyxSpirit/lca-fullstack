import assert from'node:assert/strict';
import{mock,test}from'node:test';
import*as fs from'node:fs/promises';

test('LOT3C avoir et retour : reprise idempotente concurrente sans rejeu financier, stock ou livraison',async()=>{
 const documents=new Map<string,{id:string;file_url:string;file_hash:string}>(),files=new Map<string,Buffer>();
 const credit={id:'31',credit_note_number:'AVO-IMMUTABLE',invoice_id:'17',customer_id:'7',created_by:'9',status:'applied',reason:'Retour partiel',amount:250_000,issue_date:'2026-10-22',invoice_number:'FAC-IMMUTABLE',agency_id:'2',currency_code:'XAF',customer_name:'Client recette'};
 const vehicleReturn={id:'41',status:'CLOSED',return_number:'RET-IMMUTABLE',agency_id:'2',currency_code:'XAF',credited_amount:250_000,refunded_amount:150_000,stock_decision:'RESTOCK_USED',delivery_number_snapshot:'LIV-1',sale_number_snapshot:'V-1',customer_name_snapshot:'Client recette',vehicle_label_snapshot:'Toyota Recette',vin_snapshot:'VINIMMUTABLE00001',return_mileage:1200,decision_comment:'Retour accepté'};
 let sequence=0,forbiddenWrites=0,failStore=false,failInsert=false;
 mock.module('node:fs/promises',{namedExports:{...fs,unlink:async(path:string)=>{files.delete(path);}}});
 mock.module('../src/config/database.js',{namedExports:{execute:async()=>({}),query:async(sql:string,params:unknown[]=[])=>{
  if(sql.includes('FROM documents')){const row=documents.get(String(params[0]));return row?[row]:[];}
  if(sql.includes('FROM credit_notes cn JOIN invoices'))return[credit];
  if(sql.includes('FROM post_delivery_vehicle_returns WHERE'))return[vehicleReturn];
  if(sql.includes('post_delivery_vehicle_return_deductions'))return[{label:'Décote',amount:50_000}];
  return[];
 },transaction:async(job:any)=>job({execute:async(sql:string,params:unknown[]=[])=>{
  if(/INSERT INTO credit_notes|payment_refunds|treasury_|UPDATE (invoices|vehicles|sales|deliveries|post_delivery_vehicle_returns)|vehicle_movements|vehicle_status_history/i.test(sql))forbiddenWrites++;
  if(!sql.includes('INSERT INTO documents'))return[{affectedRows:1}];
  if(failInsert)throw new Error('insertion GED simulée');
  const sourceKey=String(params[1]);if(documents.has(sourceKey)){const error:any=new Error('doublon simulé');error.code='ER_DUP_ENTRY';throw error;}
  const id=String(documents.size+1),file_url=String(params[5]),file_hash=String(params[11]);documents.set(sourceKey,{id,file_url,file_hash});return[{insertId:Number(id)}];
 }})}});
 mock.module('../src/realtime/socket.js',{namedExports:{emitToAgency:()=>undefined}});
 mock.module('../src/modules/documents/document-storage.js',{namedExports:{documentHash:(buffer:Buffer)=>`hash-${buffer.length}`,inspectDocumentFile:async()=> 'AVAILABLE',readDocumentFile:async()=>Buffer.alloc(0),storeDocument:async(file:{buffer:Buffer})=>{if(failStore)throw new Error('stockage GED simulé');const storageKey=`lot3c-${++sequence}.pdf`;files.set(storageKey,file.buffer);return{absolute:storageKey,storageKey};}}});
 mock.module('../src/modules/documents/commercial-document.js',{namedExports:{renderDeliveryDocument:async()=>Buffer.alloc(0),renderInvoiceDocument:async()=>Buffer.alloc(0),renderPaymentReceiptData:async()=>Buffer.alloc(0),renderQuotationDocument:async()=>Buffer.alloc(0),renderSaleOrderDocument:async()=>Buffer.alloc(0)}});
 mock.module('../src/modules/document-marks/document-mark-policy.service.js',{namedExports:{resolveDocumentMarks:async()=>null,snapshotResolvedMarks:async()=>undefined}});
 try{
  const{archiveCreditNote,archiveVehicleReturn,businessArchiveTestHooks}=await import(`../src/modules/documents/business-document.service.js?lot3c=${Date.now()}`);
  businessArchiveTestHooks.beforeBusinessPdfRender=async()=>{throw new Error('rendu PDF simulé')};await assert.rejects(()=>archiveCreditNote('31',null),/rendu PDF simulé/);businessArchiveTestHooks.beforeBusinessPdfRender=undefined;assert.equal(documents.size,0);assert.equal(files.size,0);
  failStore=true;await assert.rejects(()=>archiveCreditNote('31',null),/stockage GED simulé/);failStore=false;assert.equal(documents.size,0);
  failInsert=true;await assert.rejects(()=>archiveCreditNote('31',null),/insertion GED simulée/);failInsert=false;assert.equal(documents.size,0);assert.equal(files.size,0,'le fichier orphelin est compensé');
  const credits=await Promise.all([archiveCreditNote('31',null),archiveCreditNote('31',null)]);assert.deepEqual(credits.map(x=>x.created).sort(),[false,true]);assert.equal(documents.has('credit-note:31:issued:v1'),true);assert.equal(files.size,1);
  const creditFileCount=files.size;assert.equal((await archiveCreditNote('31',null)).created,false);assert.equal(files.size,creditFileCount);

  const returns=await Promise.all([archiveVehicleReturn('41',null),archiveVehicleReturn('41',null)]);assert.deepEqual(returns.map(x=>x.created).sort(),[false,true]);assert.equal(documents.has('vehicle-return:41:closed:v1'),true);assert.equal(files.size,2);
  const returnFileCount=files.size;assert.equal((await archiveVehicleReturn('41',null)).created,false);assert.equal(files.size,returnFileCount);

  assert.equal(forbiddenWrites,0);
  assert.deepEqual({number:credit.credit_note_number,status:credit.status,amount:credit.amount,reason:credit.reason},{number:'AVO-IMMUTABLE',status:'applied',amount:250_000,reason:'Retour partiel'});
  assert.deepEqual({status:vehicleReturn.status,credit:vehicleReturn.credited_amount,refund:vehicleReturn.refunded_amount,stock:vehicleReturn.stock_decision},{status:'CLOSED',credit:250_000,refund:150_000,stock:'RESTOCK_USED'});
 }finally{mock.restoreAll();}
});

test('LOT3C routes dédiées conservent RBAC, scopes et séparation documentaire',async()=>{
 const{readFileSync}=await import('node:fs'),billing=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8'),returns=readFileSync(new URL('../src/modules/vehicle-returns/vehicle-return.routes.ts',import.meta.url),'utf8');
 assert.match(billing,/post\('\/credit-notes\/:id\/archive',requirePermission\('billing\.invoice\.cancel'\)/);assert.match(billing,/get\('\/credit-notes\/:id\/pdf',requirePermission\('billing\.invoice\.view'\)/);
 assert.match(billing,/requireBusinessArchive\(`credit-note:\$\{result\.id\}:issued`/,'création standard suivie de son archivage normal');
 const standard=billing.slice(billing.indexOf("post('/credit-notes/:id/archive'"),billing.indexOf("post('/payments/:id/refund'"));assert.match(standard,/access\(String\(note\.invoice_id\),r,'billing\.invoice\.cancel'\)/);assert.doesNotMatch(standard,/INSERT INTO credit_notes|payment_refunds|postPaymentRefundMovement/);
 assert.match(returns,/post\('\/vehicle-returns\/:id\/archive',requirePermission\('vehicle\.return\.stock\.receive'\)/);assert.match(returns,/post\('\/vehicle-returns\/:id\/credit-notes\/:creditNoteId\/archive',requirePermission\('vehicle\.return\.financial\.resolve'\)/);
 for(const marker of['before===\'AVAILABLE\'','before!==\'MISSING_RECORD\'','archive_retry_completed'])assert.match(returns,new RegExp(marker));
 const recovery=returns.slice(returns.indexOf("post('/vehicle-returns/:id/archive'"));assert.doesNotMatch(recovery,/UPDATE vehicles|INSERT INTO credit_notes|payment_refunds|postPaymentRefundMovement|vehicle_movements/);
 for(const scope of['OWN','AGENCY','CONCESSION','GLOBAL'])assert.match(returns,new RegExp(`s==='${scope}'`));
});
