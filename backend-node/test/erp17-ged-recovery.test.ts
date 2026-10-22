import assert from 'node:assert/strict';
import {mock,test} from 'node:test';
import * as fs from 'node:fs/promises';

test('ERP17 GED facture Atelier : échec rendu, échec insertion, reprise et rejeu sans doublon',async()=>{
  const files=new Set<string>();
  let documentId:string|null=null, renderFails=false, insertFails=false, sequence=0;
  const invoice={id:'17',invoice_number:'ERP17-SIM',agency_id:'2',status:'issued'};
  mock.module('node:fs/promises',{namedExports:{...fs,unlink:async(path:string)=>{assert.ok(files.delete(path));}}});
  mock.module('../src/config/database.js',{namedExports:{
    execute:async()=>({}),
    query:async(sql:string)=>sql.includes('FROM invoices')?[invoice]:documentId?[{id:documentId,file_url:'ged:sim'}]:[],
    transaction:async(job:any)=>job({execute:async()=>{if(insertFails)throw new Error('insertion GED simulée');documentId='1';return[{insertId:1}];}}),
  }});
  mock.module('../src/realtime/socket.js',{namedExports:{emitToAgency:()=>undefined}});
  const render=async()=>{if(renderFails)throw new Error('rendu simulé');return Buffer.from('%PDF-ERP17');};
  mock.module('../src/modules/documents/commercial-document.js',{namedExports:{renderDeliveryDocument:render,renderInvoiceDocument:render,renderPaymentReceiptData:render,renderQuotationDocument:render,renderSaleOrderDocument:render}});
  mock.module('../src/modules/documents/document-storage.js',{namedExports:{documentHash:()=> 'hash',inspectDocumentFile:async()=> 'AVAILABLE',readDocumentFile:render,storeDocument:async()=>{const absolute=`/tmp/erp17-simulation-${++sequence}`;files.add(absolute);return{absolute,storageKey:absolute};}}});
  try{
    const {archiveInvoice,requireBusinessArchive}=await import('../src/modules/documents/business-document.service.js');
    const run=()=>requireBusinessArchive('invoice:17:issued',()=>archiveInvoice('17','1'));
    renderFails=true;
    await assert.rejects(run,/Finalisation enregistrée/);
    assert.equal(documentId,null);assert.equal(files.size,0);assert.equal(invoice.status,'issued');
    renderFails=false;insertFails=true;
    await assert.rejects(run,/Finalisation enregistrée/);
    assert.equal(documentId,null);assert.equal(files.size,0);assert.equal(invoice.status,'issued');
    insertFails=false;
    assert.deepEqual(await run(),{id:'1',created:true});
    assert.deepEqual(await run(),{id:'1',created:false});
    assert.equal(files.size,1);assert.equal(sequence,2);assert.equal(invoice.id,'17');
  }finally{mock.restoreAll();}
});
