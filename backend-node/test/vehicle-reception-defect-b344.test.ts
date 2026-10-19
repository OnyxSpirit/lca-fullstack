import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {vehicleReceptionPricing} from '../src/modules/vehicles/vehicle-reception-defect.js';

test('B344 sans défaut conserve le prix initial',()=>{
  assert.deepEqual(vehicleReceptionPricing({hasReceptionDefect:false,receptionInitialSalePrice:25_000_000,receptionDefectDiscount:0,minimumPrice:20_000_000}),{hasReceptionDefect:false,receptionDefectDescription:null,receptionInitialSalePrice:25_000_000,receptionDefectDiscount:0,receptionDefectDiscountReason:null,finalSalePrice:25_000_000});
});

test('B344 défaut sans réduction conserve le constat et le prix',()=>{
  const value=vehicleReceptionPricing({hasReceptionDefect:true,receptionDefectDescription:'Rayure aile droite',receptionInitialSalePrice:25_000_000,receptionDefectDiscount:0,minimumPrice:20_000_000});
  assert.equal(value.finalSalePrice,25_000_000);assert.equal(value.receptionDefectDiscountReason,null);
});

test('B344 déduit une fois 2 000 000 de 25 000 000',()=>{
  const value=vehicleReceptionPricing({hasReceptionDefect:true,receptionDefectDescription:'Phare cassé',receptionInitialSalePrice:25_000_000,receptionDefectDiscount:2_000_000,receptionDefectDiscountReason:'Réduction liée au phare',minimumPrice:23_000_000});
  assert.equal(value.finalSalePrice,23_000_000);assert.equal(value.receptionInitialSalePrice,25_000_000);
});

for(const [name,input,message] of [
  ['réduction supérieure',{hasReceptionDefect:true,receptionDefectDescription:'Défaut',receptionInitialSalePrice:25,receptionDefectDiscount:30,receptionDefectDiscountReason:'Motif'},/inférieure/],
  ['réduction négative',{hasReceptionDefect:true,receptionDefectDescription:'Défaut',receptionInitialSalePrice:25,receptionDefectDiscount:-1,receptionDefectDiscountReason:'Motif'},/montant positif/],
  ['description absente',{hasReceptionDefect:true,receptionInitialSalePrice:25,receptionDefectDiscount:0},/description/],
  ['motif absent',{hasReceptionDefect:true,receptionDefectDescription:'Défaut',receptionInitialSalePrice:25,receptionDefectDiscount:2},/motif/],
  ['réduction sans défaut',{hasReceptionDefect:false,receptionInitialSalePrice:25,receptionDefectDiscount:2},/défaut déclaré/],
  ['prix inférieur au minimum',{hasReceptionDefect:true,receptionDefectDescription:'Défaut',receptionInitialSalePrice:25,receptionDefectDiscount:2,receptionDefectDiscountReason:'Motif',minimumPrice:24},/prix minimum/],
] as const)test(`B344 refuse ${name}`,()=>assert.throws(()=>vehicleReceptionPricing(input),message));

test('B344 migration 095 est additive et sans backfill spéculatif',()=>{
  const sql=readFileSync(new URL('../database/migrations/095_vehicle_reception_defect.sql',import.meta.url),'utf8');
  assert.match(sql,/ALTER TABLE vehicles/);assert.match(sql,/reception_initial_sale_price DECIMAL\(18,2\) NULL/);assert.match(sql,/reception_defect_discount DECIMAL\(18,2\) NOT NULL DEFAULT 0/);assert.doesNotMatch(sql,/\bUPDATE\s+vehicles\b/i);assert.doesNotMatch(sql,/DROP\s+(TABLE|COLUMN)/i);
});

test('B344 stock, devis et ventes consomment toujours le prix courant canonique',()=>{
  const route=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8'),quotation=readFileSync(new URL('../src/modules/quotations/quotation.service.ts',import.meta.url),'utf8'),sale=readFileSync(new URL('../src/modules/sales/sale.service.ts',import.meta.url),'utf8');
  assert.match(route,/sale_price/);assert.match(quotation,/salePriceHt=amount\(vehicle\.sale_price/);assert.match(sale,/effectiveSubtotal=Number\(vehicle\.sale_price\)/);assert.doesNotMatch(`${quotation}${sale}`,/reception_defect_discount/);
});
