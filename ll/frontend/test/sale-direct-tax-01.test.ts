import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const wizard=read('../src/modules/sales/SaleWizardModal.tsx');
const invoice=read('../src/modules/billing/NewInvoiceModal.tsx');
const hooks=read('../src/api/erpHooks.ts');

test('SALE-TAX-01/02/03 vente directe expose le régime et le taux configuré',()=>{
  assert.match(wizard,/Fiscalité de la vente directe/);
  assert.match(wizard,/Soumis à TVA/);assert.match(wizard,/Sans TVA/);
  assert.match(wizard,/taxRate=taxConfig\.data\?\.defaultVatRate\?\?0/);
  assert.match(hooks,/\/sales\/config\/direct-tax/);
});

test('SALE-TAX-05/06/09 réutilise HT TTC et sales.tax.override',()=>{
  assert.match(wizard,/canOverrideTax=auth\.can\(['"]sales\.tax\.override['"]\)/);
  assert.match(wizard,/<option value="HT">Prix HT<\/option>/);
  assert.match(wizard,/<option value="TTC">Prix TTC<\/option>/);
  assert.match(wizard,/disabled=\{!canOverrideTax\}/);
});

test('SALE-TAX-07/08 masque la fiscalité directe pour une conversion de devis',()=>{
  assert.match(wizard,/!initialQuotationId&&<div[^>]*>[\s\S]*Fiscalité de la vente directe/);
  assert.match(wizard,/quotationId:initialQuotationId/);
});

test('INVOICE-VEH-01/02 quantité véhicule préremplie à 1 depuis saleId',()=>{
  assert.match(invoice,/prefillVehicleInvoice[\s\S]*quantity:['"]1['"]/);
  assert.match(invoice,/initialSaleId[\s\S]*setForm\(value=>prefillVehicleInvoice\(value,sale\)\)/);
});

test('INVOICE-VEH-03/04 sélection manuelle utilise le même préremplissage',()=>{
  const calls=invoice.match(/prefillVehicleInvoice\(value,sale\)/g)??[];
  assert.equal(calls.length,2);
});

test('INVOICE-VEH-05/06/07 reprend les trois dimensions fiscales de la vente',()=>{
  assert.match(invoice,/taxMode:sale\.taxMode,priceInputMode:sale\.priceInputMode,taxRate:sale\.taxRate/);
});

test('INVOICE-VEH-09 les lignes non véhicule restent sans quantité forcée',()=>{
  assert.match(invoice,/emptyLine = \(taxRate: number \| string = ''\).*quantity: ''/);
  assert.match(invoice,/items: \[emptyLine\(\)\]/);
});
