import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {receptionPricing} from '../src/modules/vehicles/vehicleReceptionPricing.js';

const base={salePrice:'25000000',minimumPrice:'20000000',hasReceptionDefect:true,receptionDefectDescription:'Phare cassé',receptionDefectDiscount:'2000000',receptionDefectDiscountReason:'Réduction liée au phare'};

test('B344 UI calcule toujours depuis le prix initial stable',()=>{
  assert.deepEqual(receptionPricing(base),{initial:25_000_000,discount:2_000_000,final:23_000_000,error:null});
  assert.equal(receptionPricing({...base,salePrice:'26000000'}).final,24_000_000);
});

test('B344 UI restaure le prix lorsque le défaut est retiré',()=>{
  assert.equal(receptionPricing({...base,hasReceptionDefect:false,receptionDefectDiscount:'0',receptionDefectDescription:'',receptionDefectDiscountReason:''}).final,25_000_000);
});

test('B344 UI applique les champs conditionnels et affiche le récapitulatif',()=>{
  const modal=readFileSync(new URL('../src/modules/vehicles/NewVehicleModal.tsx',import.meta.url),'utf8'),detail=readFileSync(new URL('../src/modules/vehicles/VehicleDetailPage.tsx',import.meta.url),'utf8');
  assert.match(modal,/État du véhicule à la réception/);assert.match(modal,/Aucun défaut constaté/);assert.match(modal,/Défaut constaté/);assert.match(modal,/Prix après réduction/);assert.match(detail,/État à la réception/);assert.match(detail,/Prix de vente courant/);
});

test('B344 UI conserve le prix courant dans Stock sans remise parallèle',()=>{
  const list=readFileSync(new URL('../src/modules/vehicles/VehiclesListPage.tsx',import.meta.url),'utf8');
  assert.match(list,/sellingPriceTTC/);assert.doesNotMatch(list,/receptionDefectDiscount/);
});
