import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const page=readFileSync(new URL('../src/modules/settings/SettingsPage.tsx',import.meta.url),'utf8');

test('LOT14B2B-01 les sections autonomes utilisent des imports dynamiques',()=>{
  for(const component of ['BaysSettings','SuppliersSettings','WorkshopLaborRatesSettings','ManufacturersSettings','DocumentReferencesSettings','DocumentMarksSettings','VehicleLocationsSettings','DeliveryServicesSettings','DeliveryChecklistTemplates']){
    assert.match(page,new RegExp(`const ${component}=lazy\\(\\(\\)=>import\\(`));
    assert.doesNotMatch(page,new RegExp(`import \\{[^}]*${component}[^}]*\\} from`));
  }
});

test('LOT14B2B-02 identité, fiscalité et agences restent dans le parent',()=>{
  for(const token of ['identity, setIdentity','vat, setVat','agencyForm, setAgencyForm','editedAgency, setEditedAgency'])assert.match(page,new RegExp(token.replace(', ','\\s*,\\s*')));
  assert.match(page,/tab === 'general'/);
  assert.match(page,/tab === 'agencies'/);
  assert.match(page,/saveIdentity/);
  assert.match(page,/saveBusiness/);
  assert.match(page,/saveAgency/);
});

test('LOT14B2B-03 les onglets sensibles restent conditionnés par leurs permissions',()=>{
  for(const permission of ['settings.view','settings.update','settings.manufacturers.view','delivery.service.view','delivery.service.manage','delivery.checklist.config.view','delivery.checklist.config.manage','workshop.resources.view','workshop.resources.manage','parts.suppliers.view','parts.suppliers.manage','vehicles.assignments.view'])assert.match(page,new RegExp(permission.replaceAll('.','\\.')));
});

test('LOT14B2B-04 le fallback local est accessible',()=>{
  assert.match(page,/const SettingsSectionBoundary=/);
  assert.match(page,/Suspense fallback=/);
  assert.match(page,/role="status" aria-live="polite"/);
  assert.match(page,/Chargement de la section Paramètres…/);
});
