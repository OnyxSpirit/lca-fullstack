import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {renderRepairOrderDocument} from '../src/modules/documents/commercial-document.js';
import {repairOrderFinancialSummary} from '../src/modules/workshop/repair-order-finance.js';

test('SAV-OR-12 calcule pièces, main-d’œuvre, remises, TVA et TTC depuis les lignes actives agrégées',()=>{
  const result=repairOrderFinancialSummary([
    {item_type:'part',gross:200,discount:20,subtotal:180,tax:32.4},
    {item_type:'labor',gross:100,discount:0,subtotal:100,tax:18},
  ],'XAF');
  assert.deepEqual({gross:result.gross,discount:result.discount,subtotal:result.subtotal,tax:result.tax,total:result.total},{gross:300,discount:20,subtotal:280,tax:50.4,total:330.4});
  assert.equal(result.byType.part.total,212.4);
  assert.equal(result.byType.labor.total,118);
  const precise=repairOrderFinancialSummary([{item_type:'part',gross:57156.288,discount:0,subtotal:57156.288,tax:10288.13184}],'XAF');
  assert.equal(precise.tax,10288.13);assert.equal(precise.total,67444.42);assert.equal(typeof precise.tax,'number');
});

test('SAV-OR-10 génère un PDF OR via le renderer documentaire partagé',async()=>{
  const pdf=await renderRepairOrderDocument({agency_id:'1',order_number:'OR-TEST',created_at:'2026-09-19',status:'ready',customer_name:'Client Test',vehicle_label:'Marque Modèle',vin:'VIN123',registration_number:'AA-001',mileage_in:1200,complaint:'Bruit',inspection:null,diagnostics:[{diagnosis:'Roulement',recommendations:'Remplacer'}],interventions:[{description:'Remplacement',status:'completed'}],items:[{item_type:'part',status:'active',part_reference:'P-1',description:'Pièce',quantity:2,unit_price:100,discount:10,tax_rate:18,line_total:190},{item_type:'labor',status:'active',description:'Pose',quantity:1.5,unit_price:50,discount:0,tax_rate:18,line_total:75}],financialSummary:{subtotal:265,discount:10,tax:47.7,total:312.7,currencyCode:'XAF'},qualityControls:[{result:'passed',observations:'OK'}],invoice:null},{legalName:'LCA',tradeName:'LCA',agencyName:'Agence',currencyCode:'XAF',logoCandidates:[]});
  assert.equal(pdf.subarray(0,4).toString(),'%PDF');
  assert.ok(pdf.length>1500);
});

test('SAV-OR-11 et 13 conservent les verrous serveur sur états historiques et workflow',async()=>{
  const source=await readFile(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');
  assert.match(source,/\['completed','cancelled'\]\.includes\(schedule\.status\)/);
  assert.match(source,/Affectation terminée ou annulée : consultation uniquement/);
  assert.match(source,/ensureWritable\(ro,\['received','diagnosis'\]\)/);
  assert.match(source,/ensureWritable\(ro,\['waiting_approval'\]\)/);
  assert.match(source,/ensureWritable\(ro,\['in_progress'\]\)/);
});
