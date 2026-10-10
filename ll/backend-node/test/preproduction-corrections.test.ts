import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {test} from 'node:test';
import type {RowDataPacket} from 'mysql2/promise';
import {formatDocumentAmount} from '../src/modules/documents/document-money.js';
import {renderCommercialDocument} from '../src/modules/documents/commercial-document.js';
import {calculateTaxLine} from '../src/shared/tax-calculation.js';
import {assertVehicleMargin,vehicleCostHt} from '../src/shared/vehicle-margin.js';

const vehicle={purchase_price:35_000_000,refurbishment_cost:0,transport_cost:0,administrative_cost:0,additional_costs:0};

test('MARGIN-01..07: final sale may equal but never fall below acquisition cost',()=>{
  assert.equal(vehicleCostHt(vehicle),35_000_000);
  assert.doesNotThrow(()=>assertVehicleMargin(vehicle,36_000_000));
  assert.doesNotThrow(()=>assertVehicleMargin(vehicle,35_000_000));
  assert.throws(()=>assertVehicleMargin(vehicle,34_999_999),/coût de revient/);
  assert.doesNotThrow(()=>assertVehicleMargin(vehicle,40_000_000-5_000_000));
  assert.throws(()=>assertVehicleMargin(vehicle,40_000_000-5_000_001),/coût de revient/);
  assert.equal(vehicleCostHt({...vehicle,transport_cost:100_000}),35_100_000);
  assert.throws(()=>assertVehicleMargin({...vehicle,transport_cost:100_000},35_000_000),/coût de revient/);
});

test('MARGIN-08..09: taxable TTC is compared on net HT, not gross TTC',()=>{
  const acceptable=calculateTaxLine({quantity:1,unitPrice:41_300_000,discount:0,taxMode:'TAXABLE',priceInputMode:'TTC',taxRate:18});
  assert.equal(acceptable.netHt,35_000_000);
  assert.doesNotThrow(()=>assertVehicleMargin(vehicle,acceptable.netHt));
  const loss=calculateTaxLine({quantity:1,unitPrice:41_299_998.82,discount:0,taxMode:'TAXABLE',priceInputMode:'TTC',taxRate:18});
  assert.throws(()=>assertVehicleMargin(vehicle,loss.netHt),/coût de revient/);
});

test('PDF-MONEY: use printable French separators, never narrow NBSP',()=>{
  assert.equal(formatDocumentAmount(35_000_000,'XAF'),'35.000.000 XAF');
  assert.equal(formatDocumentAmount(1_234.5,'XAF'),'1.234,50 XAF');
  assert.equal(formatDocumentAmount(0,'XAF'),'0 XAF');
});

test('PDF-DOC: quotation/order/invoice share A4 renderer with and without logo',async()=>{
  const logo=await readFile(fileURLToPath(new URL('../../frontend/public/images/logo-lca2.png',import.meta.url)));
  const header={number:'V-2026-001',document_date:'2026-09-16',agency_id:1,currency_code:'XAF',customer_name:'Client Démonstration',customer_code:'CLI-001',subtotal:40_000_000,discount_total:5_000_000,tax_total:0,total:35_000_000,tax_mode:'TAX_EXEMPT',tax_rate_snapshot:0} as RowDataPacket;
  const items=[{description:'Véhicule neuf — exemple',quantity:1,unit_price:40_000_000,discount:5_000_000,tax_rate:0,line_total:35_000_000}] as RowDataPacket[];
  for(const kind of ['DEVIS','FACTURE','BON DE COMMANDE'] as const){
    for(const logoBase64 of [null,logo.toString('base64')]){
      const pdf=await renderCommercialDocument(kind,header,items,{legalName:'LCA Concession',agencyName:'Agence de recette',currencyCode:'XAF',logoBase64});
      assert.equal(pdf.subarray(0,4).toString(),'%PDF');
      assert.ok(pdf.length>1000);
    }
  }
  const many=Array.from({length:40},(_,index)=>({...items[0],description:`Véhicule ${index+1}`,line_total:35_000_000}));
  const multi=await renderCommercialDocument('BON DE COMMANDE',header,many as RowDataPacket[],{legalName:'LCA',currencyCode:'XAF'});
  assert.match(multi.toString('latin1'),/\/Count\s+[2-9]/);
});
