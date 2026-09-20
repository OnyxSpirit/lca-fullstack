import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {documentLogoCandidates,getReferenceDocumentLogo,renderCommercialDocument,renderDeliveryDocumentData} from '../src/modules/documents/commercial-document.js';

const identity=(logo:string|null)=>({legalName:'LCA Concession Automobile',tradeName:'LCA',agencyName:'Agence Brazzaville',agencyAddress:'Avenue de la Concession',agencyCity:'Brazzaville',phone:'+242 00 000 00 00',email:'contact@lca.local',taxIdentifier:'NIU-LCA',currencyCode:'XAF',logoCandidates:logo?[logo]:[]});
const commercialHeader={number:'DOC-2026-001',document_date:'2026-09-16',agency_id:1,currency_code:'XAF',customer_name:'Client Démonstration',customer_code:'CLI-001',subtotal:35_000_000,discount_total:0,tax_total:0,total:35_000_000,tax_mode:'TAX_EXEMPT',tax_rate_snapshot:0};
const items=[{description:'Véhicule LCA de démonstration',quantity:1,unit_price:35_000_000,discount:0,tax_rate:0,line_total:35_000_000}];
const delivery={agency_id:1,delivery_number:'PV-2026-001',scheduled_at:'2026-09-16 09:00',delivered_at:'2026-09-16 10:00',customer_name:'Client Particulier',delivery_location:'Agence Brazzaville',delivery_specialist_name:'Responsable Livraison',vehicle_label:'LCA Modèle Version',vin:'LCA12345678901234567',registration_number:'AB-123-CD',mileage_at_delivery:25,checklist:Array.from({length:24},(_,index)=>({item_name:`Contrôle et accessoire remis ${index+1} avec une observation suffisamment longue pour vérifier la pagination`,is_completed:true})),documents:[{document_name:'Carte grise',is_required:true,received:true}],signatures:[{signer_name:'Client Particulier',signed_at:'2026-09-16 10:00',document_hash:'a'.repeat(64),signature_data:''}]};

test('LOGO-01..04 le véritable logo LCA est embarqué et rend les quatre documents',async()=>{
  const logo=await getReferenceDocumentLogo();
  assert.ok(logo);
  const source=await readFile(new URL('../../frontend/public/images/logo-lca2.png',import.meta.url));
  assert.equal(createHash('sha256').update(Buffer.from(logo!,'base64')).digest('hex'),createHash('sha256').update(source).digest('hex'));
  for(const kind of ['DEVIS','FACTURE','BON DE COMMANDE'] as const){const pdf=await renderCommercialDocument(kind,commercialHeader as any,items as any,identity(logo));assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>10_000)}
  const pv=await renderDeliveryDocumentData(delivery,identity(logo));assert.equal(pv.subarray(0,4).toString(),'%PDF');assert.ok(pv.length>10_000);
});

test('LOGO-05..07 snapshot, configuration et fallback respectent leur priorité',async()=>{
  const fallback=await getReferenceDocumentLogo();
  assert.deepEqual(documentLogoCandidates('snapshot','configured',fallback),['snapshot','configured',fallback]);
  assert.deepEqual(documentLogoCandidates(null,'configured',fallback),['configured',fallback]);
  assert.deepEqual(documentLogoCandidates(null,null,fallback),[fallback]);
  const pdf=await renderCommercialDocument('FACTURE',commercialHeader as any,items as any,{...identity(fallback),logoCandidates:['logo-invalide',fallback]});
  assert.equal(pdf.subarray(0,4).toString(),'%PDF');
});

test('PV-01..10 contenu métier, VIN long, observations, signatures et pagination A4',async()=>{
  const pv=await renderDeliveryDocumentData({...delivery,customer_name:'Société Client SARL',customer_notes:'Observation client de recette. '.repeat(150),quality_notes:'Réserve de qualité consignée.'},identity(await getReferenceDocumentLogo()));
  assert.equal(pv.subarray(0,4).toString(),'%PDF');
  assert.match(pv.toString('latin1'),/\/MediaBox\s*\[0\s+0\s+595\.28\s+841\.89\]/);
  assert.match(pv.toString('latin1'),/\/Count\s+[2-9]/);
});

test('PV-07 conserve la signature électronique PNG persistée',async()=>{
  const logo=await getReferenceDocumentLogo();
  const signed={...delivery,checklist:[],signatures:[{...delivery.signatures[0],signature_data:`data:image/png;base64,${logo}`}]};
  const pdf=await renderDeliveryDocumentData(signed,identity(logo));
  assert.match(pdf.toString('latin1'),/\/Subtype\s*\/Image/);
});

test('PV-06 sans logo reste générable et correctement structuré',async()=>{
  const pv=await renderDeliveryDocumentData({...delivery,checklist:delivery.checklist.slice(0,2)},identity(null));
  assert.equal(pv.subarray(0,4).toString(),'%PDF');
  assert.ok(pv.length>2_000);
});

test('PV-DESIGN-01 version courte, listes et signatures tiennent sur une page A4',async()=>{
  const pdf=await renderDeliveryDocumentData({...delivery,checklist:delivery.checklist.slice(0,1),customer_notes:null,quality_notes:null,signatures:[]},identity(await getReferenceDocumentLogo()));
  assert.match(pdf.toString('latin1'),/\/MediaBox\s*\[0\s+0\s+595\.28\s+841\.89\]/);
  assert.match(pdf.toString('latin1'),/\/Count\s+1\b/);
});

test('PV-DESIGN-02 réserves et contrôles longs conservent pagination et signature',async()=>{
  const pdf=await renderDeliveryDocumentData({...delivery,checklist:Array.from({length:45},(_,index)=>({item_name:`Contrôle de remise ${index+1}`,is_completed:index%2===0,notes:index%7===0?'Observation spécifique. '.repeat(8):''})),customer_notes:'Observation longue du client. '.repeat(120),quality_notes:'Réserve consignée. '.repeat(100)},identity(await getReferenceDocumentLogo()));
  assert.match(pdf.toString('latin1'),/\/Count\s+[3-9]/);
  assert.match(pdf.toString('latin1'),/\/MediaBox\s*\[0\s+0\s+595\.28\s+841\.89\]/);
});
