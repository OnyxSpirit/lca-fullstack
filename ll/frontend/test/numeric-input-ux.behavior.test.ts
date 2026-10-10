import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { numberOrUndefined, requiredNumber } from '../src/lib/numericInput';

const source=(path:string)=>fs.readFileSync(new URL(`../src/${path}`,import.meta.url),'utf8');

test('un brouillon numérique distingue vide, zéro et décimale dans le payload',()=>{
  assert.equal(numberOrUndefined(''),undefined);
  assert.equal(numberOrUndefined('0'),0);
  assert.equal(numberOrUndefined('2.5'),2.5);
  assert.throws(()=>requiredNumber(''),/requise/);
});

test('création véhicule: kilométrage et prix sont vides, effaçables et contextualisés',()=>{
  const page=source('modules/vehicles/NewVehicleModal.tsx');
  assert.match(page,/mileage:''/);
  assert.match(page,/placeholder="Saisir le kilométrage"/);
  assert.match(page,/Saisir le prix d(?:’|\\u2019)achat/);
  assert.match(page,/event\.target\.value/);
  assert.doesNotMatch(page,/event\.target\.type==='number'\?Number/);
});

test('SAV, CRM, facturation et paramètres conservent la chaîne vide pendant la saisie',()=>{
  const repair=source('modules/service/NewRepairOrderModal.tsx');
  const quotation=source('modules/crm/QuotationModal.tsx');
  const invoice=source('modules/billing/NewInvoiceModal.tsx');
  const rates=source('modules/settings/WorkshopLaborRatesSettings.tsx');
  assert.match(repair,/mileage:''/);
  assert.match(repair,/mileage: e\.target\.value/);
  assert.match(quotation,/setDiscount\(e\.target\.value\)/);
  assert.match(invoice,/quantity: '', unitPrice: '', discount: ''/);
  assert.match(rates,/hourlyRate:''/);
});

test('les conversions ont lieu à la soumission et acceptent explicitement zéro',()=>{
  const invoice=source('modules/billing/NewInvoiceModal.tsx');
  const repair=source('modules/service/NewRepairOrderModal.tsx');
  assert.match(invoice,/quantity:Number\(item\.quantity\)/);
  assert.match(repair,/const mileage=Number\(formData\.mileage\)/);
  assert.match(repair,/formData\.mileage===''\|\|/);
  assert.equal(requiredNumber('0'),0);
});
