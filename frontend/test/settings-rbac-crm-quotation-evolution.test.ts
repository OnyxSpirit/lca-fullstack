import assert from 'node:assert/strict';
import test from 'node:test';
import {readContractFileSync as readFileSync} from './helpers/source-contract';
const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('signature personnelle accessible depuis Mon profil sans settings.view',()=>{
  const app=source('src/App.tsx'),header=source('src/components/layout/Header.tsx'),page=source('src/modules/settings/MySignaturePage.tsx');
  assert.match(app,/path="profile\/signature"/);assert.match(app,/permission="signature\.view\.self"/);
  assert.match(header,/Ma signature/);assert.match(page,/personalOnly/);assert.doesNotMatch(page,/settings\.view/);
});

test('paramètres affiche uniquement les sections autorisées',()=>{
  const page=source('src/modules/settings/SettingsPage.tsx');
  for(const code of ['settings.general.view','settings.documents.view','settings.workshop_rates.view','settings.agencies.view'])assert.match(page,new RegExp(code.replaceAll('.','\\.')));
  assert.match(page,/canManageDocuments/);assert.match(page,/canManageAgencies/);
});

test('devis multivéhicule conserve le choix manuel et les références normalisées',()=>{
  const modal=source('src/modules/crm/QuotationModal.tsx'),hooks=source('src/api/erpHooks.ts');
  assert.match(hooks,/useCommercialModelsQuery/);assert.match(modal,/items,clientRequestId/);assert.match(modal,/setLine\(line\.key/);
  assert.match(modal,/Stock physique/);assert.match(modal,/VIN \{v\.vin\}/);assert.match(modal,/onChange=\{event=>choose\(line,event\.target\.value\)\}/);
});
