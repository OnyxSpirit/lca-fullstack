import assert from 'node:assert/strict';
import {mock,test} from 'node:test';
import * as fs from 'node:fs/promises';

test('LOT1 reprise devis/vente : panne, idempotence, concurrence, immutabilité et PDF historique',async()=>{
  const documents=new Map<string,{id:string;file_url:string;file_hash:string}>(),files=new Map<string,Buffer>();
  const quotation={id:'41',customer_id:'7',quotation_number:'DEV-IMMUTABLE',agency_id:'2',status:'sent',document_identity_snapshot:'{"tradeName":"LCA"}'};
  const sale={id:'51',sale_number:'V-IMMUTABLE',agency_id:'2',status:'confirmed'};
  let sequence=0,renderCount=0,failRender=false,failInsert=false;
  mock.module('node:fs/promises',{namedExports:{...fs,unlink:async(path:string)=>{files.delete(path);}}});
  mock.module('../src/config/database.js',{namedExports:{
    execute:async()=>({}),
    query:async(sql:string,params:unknown[]=[])=>{
      if(sql.includes('FROM quotations WHERE'))return[quotation];
      if(sql.includes('FROM sales WHERE'))return[sale];
      if(sql.includes('document_mark_policies'))return[];
      if(sql.includes('FROM documents')){const key=String(params[0]??'').replace(/%$/,'');const row=documents.get(key)??[...documents.entries()].find(([sourceKey])=>sourceKey.startsWith(key))?.[1];return row?[row]:[];}
      return[];
    },
    transaction:async(job:any)=>job({execute:async(sql:string,params:unknown[]=[])=>{
      if(!sql.includes('INSERT INTO documents'))return[{affectedRows:1}];
      if(failInsert)throw new Error('insertion GED simulée');
      const sourceKey=String(params[1]);
      if(documents.has(sourceKey)){const error:any=new Error('doublon simulé');error.code='ER_DUP_ENTRY';throw error;}
      const id=String(documents.size+1),file_url=String(params[5]),file_hash=String(params[11]);documents.set(sourceKey,{id,file_url,file_hash});return[{insertId:Number(id)}];
    }}),
  }});
  mock.module('../src/realtime/socket.js',{namedExports:{emitToAgency:()=>undefined}});
  const render=async()=>{renderCount++;if(failRender)throw new Error('rendu PDF simulé');return Buffer.from(`%PDF-LOT1-${renderCount}`)};
  mock.module('../src/modules/documents/commercial-document.js',{namedExports:{renderDeliveryDocument:render,renderInvoiceDocument:render,renderPaymentReceiptData:render,renderQuotationDocument:render,renderSaleOrderDocument:render}});
  mock.module('../src/modules/documents/document-storage.js',{namedExports:{
    documentHash:(buffer:Buffer)=>`hash-${buffer.toString()}`,
    inspectDocumentFile:async()=> 'AVAILABLE',
    readDocumentFile:async(fileUrl:string)=>files.get(fileUrl.replace('ged:',''))!,
    storeDocument:async(file:{buffer:Buffer})=>{const storageKey=`lot1-${++sequence}.pdf`;files.set(storageKey,file.buffer);return{absolute:storageKey,storageKey};},
  }});
  try{
    const{archiveQuotation,archiveSaleOrder,requireBusinessArchive,requiredHistoricalBusinessPdf}=await import('../src/modules/documents/business-document.service.js');
    failRender=true;
    await assert.rejects(()=>requireBusinessArchive('quotation:41:issued',()=>archiveQuotation('41','9')),/Finalisation enregistrée/);
    assert.equal(documents.size,0);assert.equal(files.size,0);assert.equal(quotation.status,'sent');assert.equal(quotation.quotation_number,'DEV-IMMUTABLE');
    failRender=false;failInsert=true;
    await assert.rejects(()=>requireBusinessArchive('quotation:41:issued',()=>archiveQuotation('41','9')),/Finalisation enregistrée/);
    assert.equal(documents.size,0);assert.equal(files.size,0);assert.equal(quotation.document_identity_snapshot,'{"tradeName":"LCA"}');
    failInsert=false;
    const quoteResults=await Promise.all([archiveQuotation('41','9'),archiveQuotation('41','9')]);
    assert.deepEqual(quoteResults.map(x=>x.created).sort(),[false,true]);
    assert.equal(documents.has('quotation:41:issued:v2'),true);assert.equal(files.size,1);
    const rendersAfterQuote=renderCount;
    assert.equal((await archiveQuotation('41','9')).created,false);assert.equal(renderCount,rendersAfterQuote,'une archive existante ne doit jamais être régénérée');
    assert.match((await requiredHistoricalBusinessPdf('quotation:41:issued:')).subarray(0,5).toString(),/%PDF-/);

    const saleResults=await Promise.all([archiveSaleOrder('51','9'),archiveSaleOrder('51','9')]);
    assert.deepEqual(saleResults.map(x=>x.created).sort(),[false,true]);
    assert.equal(documents.has('sale:51:confirmed:v2'),true);assert.equal(sale.status,'confirmed');assert.equal(sale.sale_number,'V-IMMUTABLE');
    assert.match((await requiredHistoricalBusinessPdf('sale:51:confirmed:')).subarray(0,5).toString(),/%PDF-/);
  }finally{mock.restoreAll();}
});
