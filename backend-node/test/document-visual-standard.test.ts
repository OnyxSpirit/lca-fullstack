import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {renderDeliveryPlanningDocumentData,renderVehicleDocumentData} from '../src/modules/documents/commercial-document.js';
import {documentStyle} from '../src/modules/documents/document-layout.js';

async function identity(){const logo=await readFile(new URL('../../frontend/public/images/logo-lca2.png',import.meta.url)).then(value=>value.toString('base64'));return{legalName:'LCA Concession Automobile',tradeName:'LCA',agencyName:'Agence Brazzaville',agencyAddress:'Avenue de la Concession',agencyCity:'Brazzaville',phone:'+242 00 000 00 00',email:'contact@lca.local',taxIdentifier:'NIU-LCA',currencyCode:'XAF',logoCandidates:[logo]}}

test('DOC-STYLE-01 centralise le format, les marges et la palette documentaire',()=>{
 assert.equal(documentStyle.page.size,'A4');assert.equal(documentStyle.page.margin,42);assert.equal(documentStyle.colors.primary,'#8f1722');assert.deepEqual(documentStyle.logo,{x:42,y:38,width:95,height:55});
});

test('DOC-STYLE-02 la fiche véhicule utilise le renderer PDFKit commun sans perte de contenu',async()=>{
 const pdf=await renderVehicleDocumentData({agencyId:'1',stockNumber:'STK-001',vehicleType:'new',brand:'Marque',model:'Modèle',version:'Premium',vin:'VIN12345678901234',registrationNumber:'AB-123-CD',year:2026,mileage:25,fuelType:'Essence',transmission:'Automatique',salePrice:35_000_000,agencyName:'Brazzaville',locationName:'Showroom',primaryImage:'/vehicles/photo.jpg'},await identity());
 assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.match(pdf.toString('latin1'),/\/MediaBox\s*\[0\s+0\s+595\.28\s+841\.89\]/);assert.match(pdf.toString('latin1'),/\/Count\s+1\b/);assert.ok(pdf.length>8_000);
});

test('DOC-STYLE-03 le planning est paginé et conserve header et footer communs',async()=>{
 const rows=Array.from({length:55},(_,index)=>({scheduled_at:`2026-09-27 ${String(8+index%10).padStart(2,'0')}:00:00`,delivery_number:`LIV-${index+1}`,customer_name:`Client ${index+1}`,vehicle_label:`Marque Modèle Version ${index+1}`,delivery_location:'Agence Brazzaville',status:index%2?'planned':'ready'}));
 const pdf=await renderDeliveryPlanningDocumentData(rows,'2026-09-27',await identity());
 assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.match(pdf.toString('latin1'),/\/Count\s+[2-9]/);assert.match(pdf.toString('latin1'),/\/MediaBox\s*\[0\s+0\s+595\.28\s+841\.89\]/);assert.ok(pdf.length>10_000);
});
