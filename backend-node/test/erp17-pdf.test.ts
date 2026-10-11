import assert from 'node:assert/strict';
import test from 'node:test';
import {execFileSync} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {invoiceDocumentLines} from '../src/modules/documents/invoice-document-lines.js';
import {renderCommercialDocument,renderRepairOrderDocument} from '../src/modules/documents/commercial-document.js';

test('ERP17 PDF : TTC Atelier, lignes véhicule intactes et plafond lisible',async()=>{
 const identity={legalName:'LCA',agencyName:'ERP17 simulation',currencyCode:'XAF',logoCandidates:[]};
 const source=[{description:'Filtre ERP17',quantity:1,unit_price:20000,discount:0,tax_rate:18.9,tax_amount:3780,line_total:20000,repair_order_item_id:6},{description:'Main-d’œuvre ERP17',quantity:1,unit_price:35000,discount:0,tax_rate:18.9,tax_amount:6615,line_total:35000,repair_order_item_id:7}];
 const lines=invoiceDocumentLines(source);assert.deepEqual(lines.map(x=>x.line_total),[23780,41615]);assert.equal(source[0].line_total,20000);
 assert.equal(invoiceDocumentLines([{line_total:46371000,tax_amount:7371000}])[0].line_total,46371000);
 const invoice=await renderCommercialDocument('FACTURE',{number:'ERP17-SIM',document_date:'2026-10-11',customer_name:'Client simulé',subtotal:55000,discount_total:0,tax_total:10395,total:65395,tax_rate_snapshot:18.9,currency_code:'XAF'} as any,lines as any,identity);
 const order=await renderRepairOrderDocument({order_number:'ERP17-OR-SIM',created_at:'2026-10-11',status:'ready',customer_name:'Client simulé',vehicle_label:'Véhicule simulé',mileage_in:50,diagnostics:[],interventions:[],items:[],qualityControls:[],financialSummary:{subtotal:0,discount:0,tax:0,total:0,currencyCode:'XAF'},warrantyDocumentContext:{contractDecision:'APPLICABLE',contractStatus:'ACTIVE',eligibility:'ACTIVE',providerName:'Constructeur simulé',mileageLimit:100000,startDate:'2026-10-11',expiryDate:'2029-10-11',initialMileage:45,claim:null}},identity);
 const text=(pdf:Buffer)=>execFileSync('pdftotext',['-','-'],{input:pdf}).toString();
 assert.match(text(invoice),/23\.780 XAF/);assert.match(text(invoice),/41\.615 XAF/);assert.match(text(invoice),/65\.395 XAF/);
 assert.match(text(order),/100 000 km/);assert.doesNotMatch(text(order),/100 \/000/);
 if(process.env.ERP17_PDF_DIR){await mkdir(process.env.ERP17_PDF_DIR,{recursive:true});await writeFile(process.env.ERP17_PDF_DIR+'/facture-simulee.pdf',invoice);await writeFile(process.env.ERP17_PDF_DIR+'/or-simule.pdf',order);}
});
