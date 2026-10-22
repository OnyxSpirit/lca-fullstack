import assert from'node:assert/strict';
import{mock,test}from'node:test';

test('LOT3A résolution canonique, fallback historique explicite et diagnostics cohérents',async()=>{
  const records=new Map<string,{source_key:string;file_url:string;file_hash:string;created_at:number}[]>();
  const files=new Map<string,{buffer:Buffer;status?:'FILE_MISSING'|'STORAGE_UNAVAILABLE'}>();
  const prefix=(value:string)=>[...records.values()].flat().filter(row=>row.source_key.startsWith(value)).sort((a,b)=>b.created_at-a.created_at);
  mock.module('../src/config/database.js',{namedExports:{execute:async()=>({}),transaction:async(job:any)=>job({execute:async()=>[{insertId:1}]}),query:async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('source_key LIKE'))return[prefix(String(params[0]).replace(/%$/,'')).filter(row=>row.source_key!==String(params[1]))[0]].filter(Boolean);
    if(sql.includes('FROM documents'))return(records.get(String(params[0]))??[]).slice(0,1);
    return[];
  }}});
  mock.module('../src/realtime/socket.js',{namedExports:{emitToAgency:()=>undefined}});
  mock.module('../src/modules/documents/document-storage.js',{namedExports:{
    documentHash:()=>'',storeDocument:async()=>({storageKey:'x',absolute:'x'}),
    inspectDocumentFile:async(url:string,hash:string,verify:boolean)=>{const file=files.get(url);if(!file)return'FILE_MISSING';if(file.status)return file.status;if(verify&&hash!==`hash:${file.buffer.toString()}`)return'INTEGRITY_ERROR';return'AVAILABLE'},
    readDocumentFile:async(url:string,hash:string)=>{const file=files.get(url);if(!file)throw Object.assign(new Error('Fichier documentaire indisponible'),{status:410});if(file.status==='STORAGE_UNAVAILABLE')throw Object.assign(new Error('Stockage documentaire temporairement indisponible'),{status:503});if(hash!==`hash:${file.buffer.toString()}`)throw Object.assign(new Error('Intégrité de l’archive officielle invalide'),{status:409});return file.buffer},
  }});
  mock.module('../src/modules/documents/commercial-document.js',{namedExports:{renderDeliveryDocument:async()=>Buffer.alloc(0),renderInvoiceDocument:async()=>Buffer.alloc(0),renderPaymentReceiptData:async()=>Buffer.alloc(0),renderQuotationDocument:async()=>Buffer.alloc(0),renderSaleOrderDocument:async()=>Buffer.alloc(0)}});
  mock.module('../src/modules/document-marks/document-mark-policy.service.js',{namedExports:{resolveDocumentMarks:async()=>null,snapshotResolvedMarks:async()=>undefined}});
  const service=await import(`../src/modules/documents/business-document.service.js?lot3a=${Date.now()}`);
  const add=(key:string,url:string,content:string,created_at:number)=>{const buffer=Buffer.from(content);files.set(url,{buffer});records.set(key,[{source_key:key,file_url:url,file_hash:`hash:${content}`,created_at}])};

  assert.equal(await service.diagnoseBusinessArchive('quotation:1:issued:v2'),'MISSING_RECORD');
  add('quotation:1:issued:v2','canonical.pdf','canonical',2);
  assert.equal(await service.diagnoseBusinessArchive('quotation:1:issued:v2'),'AVAILABLE');
  assert.equal((await service.requiredHistoricalBusinessPdf('quotation:1:issued:v2','quotation:1:issued:')).toString(),'canonical');

  add('quotation:1:issued:v1','legacy.pdf','legacy',1);
  assert.equal((await service.requiredHistoricalBusinessPdf('quotation:1:issued:v2','quotation:1:issued:')).toString(),'canonical','v1 ne remplace jamais v2');

  records.delete('quotation:1:issued:v2');
  assert.equal(await service.diagnoseBusinessArchive('quotation:1:issued:v2',false,'quotation:1:issued:'),'HISTORICAL_ONLY');
  assert.equal((await service.requiredHistoricalBusinessPdf('quotation:1:issued:v2','quotation:1:issued:')).toString(),'legacy','fallback seulement si canonique absent');

  add('quotation:1:issued:v2','missing.pdf','canonical',3);files.delete('missing.pdf');
  assert.equal(await service.diagnoseBusinessArchive('quotation:1:issued:v2'),'FILE_MISSING');
  await assert.rejects(()=>service.requiredHistoricalBusinessPdf('quotation:1:issued:v2','quotation:1:issued:'),/Fichier documentaire indisponible/,'aucun fallback si le canonique est illisible');

  files.set('missing.pdf',{buffer:Buffer.from('canonical'),status:'STORAGE_UNAVAILABLE'});
  assert.equal(await service.diagnoseBusinessArchive('quotation:1:issued:v2'),'STORAGE_UNAVAILABLE');
  files.set('missing.pdf',{buffer:Buffer.from('altéré')});
  assert.equal(await service.diagnoseBusinessArchive('quotation:1:issued:v2',true),'INTEGRITY_ERROR');
  assert.equal(await service.diagnoseBusinessArchive('quotation:1:issued:v2',false),'AVAILABLE','la liste effectue un contrôle d’accès léger');
  await assert.rejects(()=>service.requiredHistoricalBusinessPdf('quotation:1:issued:v2','quotation:1:issued:'),/Intégrité/);
});
