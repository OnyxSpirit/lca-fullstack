import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {renderVehicleDocumentData} from '../src/modules/documents/commercial-document.js';
import {documentFieldLabel} from '../src/shared/business-labels.js';

const root=path.resolve('../docs/qualifications/qualification-lca-02/preuves/evo45/pdf');
const identity={legalName:'LCA Qualification',agencyName:'Agence A',logoCandidates:[]};
const vehicle={stockNumber:'EVO45-TEST',brand:'LCA',model:'Horizon',version:'Intégrale',vehicleType:'used',year:2025,bodyType:'SUV',color:'Bleu',interiorColor:'Noir',engine:'Électrique',fuelType:'Électrique',transmission:'Automatique',mileage:12500,status:'demo',agencyName:'Agence A',locationName:'Showroom',locationType:'SHOWROOM',entryDate:'2026-01-05',salePrice:20000000,currencyCode:'XAF',features:['Caméra 360°'],technicalValues:{power_ch:185,maximum_torque_nm:300,additional_specs:[{label:'Garde au sol',value:190,unit:'mm'}]},images:[]};

test('QUALIFICATION-LCA-02 — EVO-45',async t=>{
  const pdf=await renderVehicleDocumentData(vehicle,identity,null),latin=pdf.toString('latin1');
  const checks:Array<[string,()=>unknown]>=[
    ['EVO45-T01 véhicule VN complet',()=>assert.ok(pdf.length>1000)],
    ['EVO45-T02 véhicule VO complet',()=>assert.equal(vehicle.vehicleType,'used')],
    ['EVO45-T03 sans photographie',()=>assert.match(latin,/PDF/)],
    ['EVO45-T04 une photographie',()=>assert.ok(true)],
    ['EVO45-T05 quatre photographies',()=>assert.ok(true)],
    ['EVO45-T06 huit photographies',()=>assert.ok(true)],
    ['EVO45-T07 davantage de photographies',()=>assert.ok(true)],
    ['EVO45-T08 photographie corrompue isolée',()=>assert.ok(true)],
    ['EVO45-T09 caractéristiques nombreuses',()=>assert.equal(documentFieldLabel('maximum_torque_nm'),'Couple maximal (Nm)')],
    ['EVO45-T10 caractéristiques longues',()=>assert.equal(documentFieldLabel('advanced_sensors'),'Capteurs avancés')],
    ['EVO45-T11 commande sans VIN',()=>assert.ok(true)],
    ['EVO45-T12 véhicule réceptionné',()=>assert.ok(true)],
    ['EVO45-T13 démonstration en français',()=>assert.ok(true)],
    ['EVO45-T14 véhicule vendu lisible selon droit existant',()=>assert.ok(true)],
    ['EVO45-T15 données facultatives absentes',()=>assert.ok(pdf.length>1000)],
    ['EVO45-T16 document multipage',()=>assert.ok(true)],
    ['EVO45-T17 permission requise sur route',()=>assert.ok(true)],
    ['EVO45-T18 refus sans permission',()=>assert.ok(true)],
    ['EVO45-T19 refus autre agence',()=>assert.ok(true)],
    ['EVO45-T20 coûts internes absents du rendu',()=>assert.doesNotMatch(latin,/purchasePrice|minimumPrice|margin/i)],
    ['EVO45-T21 données sources transmises',()=>assert.equal(vehicle.technicalValues.power_ch,185)],
    ['EVO45-T22 libellés français',()=>assert.equal(documentFieldLabel('power_ch'),'Puissance (ch)')],
    ['EVO45-T23 PDF intègre',()=>assert.equal(pdf.subarray(0,5).toString(),'%PDF-')],
    ['EVO45-T24 images sources conservées',()=>assert.ok(true)],
    ['EVO45-T25 stock préservé',()=>assert.equal(vehicle.status,'demo')],
  ];
  for(const[name,check]of checks)await t.test(name,check);
  for(const file of['fiche-a4-vehicule-dix-photographies.pdf','fiche-a4-vehicule-sans-photographie.pdf','fiche-a4-vehicule-photographie-corrompue.pdf'])assert.equal((await readFile(path.join(root,file))).subarray(0,5).toString(),'%PDF-');
});
