import assert from 'node:assert/strict';
import test from 'node:test';
import {flatLaborPricing,workshopTaxSnapshot} from '../src/modules/workshop/workshop-pricing.js';

test('le forfait reste un montant fixe et n est jamais multiplié par une durée',()=>{
  assert.deepEqual(flatLaborPricing({description:'Diagnostic forfaitaire',unitPrice:25000,quantity:1}),{description:'Diagnostic forfaitaire',quantity:1,unitPrice:25000,discount:0,lineTotal:25000});
  assert.throws(()=>flatLaborPricing({description:'Diagnostic forfaitaire',unitPrice:25000,quantity:2}),/quantité égale à 1/);
});

test('le forfait exige un libellé et un montant positif',()=>{
  assert.throws(()=>flatLaborPricing({description:'',unitPrice:25000,quantity:1}),/Libellé/);
  assert.throws(()=>flatLaborPricing({description:'Forfait',unitPrice:-1,quantity:1}),/positif/);
});

test('le snapshot fiscal conserve le taux taxable et force zéro en exonération',()=>{
  assert.deepEqual(workshopTaxSnapshot('TAXABLE',18.9,20),{taxMode:'TAXABLE',taxRate:18.9});
  assert.deepEqual(workshopTaxSnapshot('TAX_EXEMPT',18.9,20),{taxMode:'TAX_EXEMPT',taxRate:0});
});
