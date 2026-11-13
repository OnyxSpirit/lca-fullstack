import test from'node:test';
import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import{renderOfficialRecord}from'../src/modules/documents/official-record-document.js';

const identity={legalName:'LCA CONGO',tradeName:'LCA',legalForm:'SARL',rccm:'CG-BZV-TEST',taxIdentifier:'NIU-TEST',bankAccount:'RIB-TEST',website:'lca.test',agencyName:'Agence recette',currencyCode:'XAF',timezone:'Africa/Brazzaville',logoCandidates:[]};

test('ABS-001..018 exposent les routes explicites, permissions et scopes documentaires',async()=>{
 const source=await readFile(new URL('../src/modules/documents/official-document.routes.ts',import.meta.url),'utf8');
 const paths=['/leads/:id/official-pdf','/customers/:id/official-pdf','/showroom/:id/visit-pdf','/showroom/test-drives/:id/pdf','/vehicles/inventory/pdf','/vehicle-movements/:id/pdf','/payment-refunds/:id/pdf','/invoices/:id/cancellation-pdf','/repair-orders/:id/diagnostic-pdf','/repair-orders/:id/quality-control-pdf','/repair-orders/:id/handover-pdf','/parts-internal-requests/:id/pdf','/parts/purchase-orders/:id/pdf','/parts/purchase-receipts/:id/pdf','/parts/movements/:id/pdf','/parts/inventory/pdf','/accounting/journals/:id/pdf','/accounting/entries/:id/pdf','/treasury/bank-statements/:id/pdf'];
 for(const path of paths)assert.ok(source.includes(path),`route absente: ${path}`);
 assert.ok((source.match(/permit\('/g)??[]).length>=paths.length);
 assert.match(source,/agency_id=\?/);
 assert.doesNotMatch(source,/\.(post|put|patch|delete)\(/i);
});

test('renderer officiel produit un A4 multipage avec identité et signatures manuscrites',async()=>{
 const rows=Array.from({length:80},(_,i)=>({reference:`REF-${i}`,description:`Ligne documentaire ${i} ${'détail '.repeat(4)}`,amount:i*1250}));
 const pdf=await renderOfficialRecord({identity,title:'DOCUMENT OFFICIEL DE RECETTE',reference:'DOC-TEST-001',fields:[{label:'Client',value:'Client de recette'},{label:'NIU',value:'NIU-CLIENT'}],columns:[{label:'Référence',key:'reference',width:100},{label:'Description',key:'description',width:311},{label:'Montant',key:'amount',width:100,align:'right'}],rows,signatureLabels:['Émetteur','Récepteur'],notice:'Consultation documentaire sans mutation métier.'});
 assert.equal(pdf.subarray(0,4).toString(),'%PDF');
 assert.match(pdf.subarray(-64).toString('latin1'),/%%EOF/);
 assert.ok(Number(/\/Count\s+(\d+)/.exec(pdf.toString('latin1'))?.[1]??0)>1);
 assert.ok(pdf.length>8_000);
});
