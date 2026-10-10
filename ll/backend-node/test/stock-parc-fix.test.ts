import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {calculateTaxLine} from '../src/shared/tax-calculation.js';
import {assertVehicleMinimumPrice} from '../src/shared/vehicle-margin.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('SPV-02 compare le plancher HT au net HT avec taux variable et arrondi',()=>{
  const standard=calculateTaxLine({quantity:1,unitPrice:21_600_000,discount:0,taxMode:'TAXABLE',priceInputMode:'TTC',taxRate:20});
  assert.equal(standard.netHt,18_000_000);
  assert.doesNotThrow(()=>assertVehicleMinimumPrice({minimum_price:18_000_000},standard.netHt));

  const variable=calculateTaxLine({quantity:1,unitPrice:118.90,discount:0,taxMode:'TAXABLE',priceInputMode:'TTC',taxRate:18.9});
  assert.deepEqual({net:variable.netHt,tax:variable.tax,total:variable.totalTtc},{net:100,tax:18.9,total:118.9});
  assert.throws(()=>assertVehicleMinimumPrice({minimum_price:100.01},variable.netHt));

  const zero=calculateTaxLine({quantity:1,unitPrice:99.995,discount:0,taxMode:'TAXABLE',priceInputMode:'TTC',taxRate:0});
  assert.deepEqual({net:zero.netHt,tax:zero.tax,total:zero.totalTtc},{net:100,tax:0,total:100});
});

test('SPV-01 baseline 058 absorbe la GED 049 et le schéma Stock',()=>{
  const baseline=read('../database/baseline/001_initial_schema.sql');
  for(const token of ['document_categories','document_types','category_id','document_type_id','document_date','idx_documents_category_type','fk_documents_type'])assert.match(baseline,new RegExp(token));
  assert.match(baseline,/baseline_001_064/);
});

test('SPV-03 une modification non financière conserve les snapshots du devis',()=>{
  const service=read('../src/modules/quotations/quotation.service.ts');
  assert.match(service,/if\(!financialChange\)/);
  assert.match(service,/UPDATE quotations SET valid_until=\?,notes=\? WHERE id=\?/);
  assert.doesNotMatch(service,/UPDATE quotations SET valid_until=\?,notes=\?[^;]+subtotal/);
});

test('SPV-04 distingue explicitement le fallback des coûts historisés',()=>{
  const reporting=read('../src/modules/reports/report.routes.ts')+read('../src/modules/dashboard/dashboard.routes.ts');
  for(const token of ['fallback_items','snapshot_items','CURRENT_COST_FALLBACK','HISTORICAL_SNAPSHOT'])assert.match(reporting,new RegExp(token));
});
