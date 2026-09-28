import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../src/modules/billing/NewInvoiceModal.tsx',import.meta.url),'utf8');

test('LOCK-01 à LOCK-10 présente les données commerciales de la vente en lecture seule',()=>{
  assert.match(source,/linkedVehicleSaleReady=form\.invoiceType===['"]vehicle['"]&&Boolean\(form\.saleId\),linkedVehicleSale=Boolean\(initialSaleId\)\|\|linkedVehicleSaleReady/);
  const start=source.indexOf('{linkedVehicleSale&&'),locked=source.slice(start,source.indexOf('</dl>}',start));
  for(const label of['Client','Type','Vente','Véhicule / description','Quantité','Prix unitaire','Remise','Régime fiscal','Mode de saisie','Taux TVA'])assert.match(locked,new RegExp(label));
  assert.doesNotMatch(locked,/<input|<select/);
  assert.match(locked,/<dd>1<\/dd>/);
});

test('LOCK-11 à LOCK-13 conserve dates et notes éditables',()=>{
  assert.match(source,/Date émission<input required type="date"/);
  assert.match(source,/Échéance<input type="date"/);
  assert.match(source,/<textarea[^>]*placeholder="Notes"[^>]*value=\{form\.notes\}/);
});

test('LOCK-03/14/15 partage le préremplissage et verrouille les deux chemins',()=>{
  assert.equal((source.match(/prefillVehicleInvoice\(value,sale\)/g)??[]).length,2);
  assert.match(source,/!initialSaleId&&<Button[^>]*onClick=\{changeVehicleSale\}>Changer de vente/);
  assert.match(source,/initialSaleId[\s\S]*setForm\(value=>prefillVehicleInvoice\(value,sale\)\)/);
});

test('LOCK-21/22 conserve les champs commerciaux des factures non liées',()=>{
  const editable=source.slice(source.indexOf('{!linkedVehicleSale&&<div'),source.indexOf('{linkedVehicleSale&&'));
  assert.match(editable,/<select required/);
  assert.match(editable,/<option value="manual">Manuelle<\/option>/);
  assert.match(editable,/<option value="parts">Pièces<\/option>/);
  assert.match(source,/!linkedVehicleSale&&<>[\s\S]*Ajouter une ligne/);
});
