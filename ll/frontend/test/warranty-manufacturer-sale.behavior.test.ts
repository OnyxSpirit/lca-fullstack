import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const manufacturers=readFileSync(new URL('../src/modules/settings/ManufacturersSettings.tsx',import.meta.url),'utf8');
const hooks=readFileSync(new URL('../src/api/settingHooks.ts',import.meta.url),'utf8');
const sale=readFileSync(new URL('../src/modules/sales/SaleWizardModal.tsx',import.meta.url),'utf8');

test('WARRANTY-MFR-FE-01 Paramètres permet une association explicite par identifiants',()=>{
  assert.match(manufacturers,/Marques rattachées/);
  assert.match(manufacturers,/<select multiple/);
  assert.match(manufacturers,/value=\{form\.brandIds\}/);
  assert.match(hooks,/brandIds:string\[\]/);
});

test('WARRANTY-MFR-FE-02 aucun rapprochement automatique par nom',()=>{
  assert.doesNotMatch(manufacturers,/provider\.name\s*===?\s*brand\.name|localeCompare\(.*name/i);
});

test('WARRANTY-MFR-FE-03 la vente dépend exclusivement de la proposition backend',()=>{
  assert.match(sale,/useVehicleWarrantyProposalQuery\(vehicleId\)/);
  assert.match(sale,/option value="APPLICABLE" disabled=\{!warrantyProposal\.data\?\.applicable\}/);
  assert.match(sale,/setWarrantyMonths\(String\(proposal\.durationMonths/);
  assert.match(sale,/setWarrantyMileage\(proposal\.mileageLimit/);
});
