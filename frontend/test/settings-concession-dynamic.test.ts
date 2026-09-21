import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const page=source('src/modules/settings/SettingsPage.tsx');
const hooks=source('src/api/settingHooks.ts');
const resources=source('src/modules/settings/OperationalResourcesSettings.tsx');
const laborRates=source('src/modules/settings/WorkshopLaborRatesSettings.tsx');

test('SETTINGS-FE-01 accès et queries reposent sur settings.view',()=>{
  assert.match(page,/canView=can\('settings\.view'\)/);
  assert.match(page,/useSettingsQuery\(canView\)/);
  assert.match(page,/useCurrentConcessionQuery\(canView\)/);
  assert.match(page,/useSettingsAgenciesQuery\(canView\)/);
});

test('SETTINGS-FE-02 lecture seule conserve les onglets et désactive les champs',()=>{
  assert.match(page,/tabs:Tab\[]=\['general','workshop'/);
  assert.match(page,/disabled=\{!admin\}/);
  assert.match(page,/\{admin&&<div className="flex items-end gap-2"/);
});

test('SETTINGS-FE-03 actions agence sont absentes sans settings.update',()=>{
  assert.match(page,/\{admin&&<Card><CardHeader><div><CardTitle>Créer une agence/);
  assert.match(page,/\{admin&&<div className="mt-4 flex gap-2 border-t pt-3"/);
  assert.match(page,/\{admin&&editedAgency/);
});

test('SETTINGS-FE-04 ressources opérationnelles séparent view et manage',()=>{
  assert.match(resources,/can\("parts\.suppliers\.manage"\)/);
  assert.match(resources,/can\("workshop\.resources\.manage"\)/);
  assert.match(resources,/\{canManage && <Card>/);
});

test('SETTINGS-FE-05 cache Settings est isolé par utilisateur et agence',()=>{
  assert.match(hooks,/useSettingsContext/);
  assert.match(hooks,/\.\.\.settingKeys\.settings,userId,agencyId/);
  assert.match(hooks,/\.\.\.settingKeys\.identity,userId,agencyId/);
  assert.match(hooks,/\.\.\.settingKeys\.agencies,userId,agencyId/);
});

test('SETTINGS-FE-06 devise affichée vient de Settings, pas d’un XAF décoratif',()=>{
  assert.match(page,/settings\.data\?\.concession\.currencyCode/);
  assert.match(laborRates,/currencyCode/);
  assert.doesNotMatch(laborRates,/XAF HT\/h/);
});

test('SETTINGS-FE-07 erreurs, loading et double clic utilisent les mutations',()=>{
  assert.match(page,/description: error instanceof Error \? error\.message/);
  assert.match(page,/loading=\{updateConcession\.isPending\}/);
  assert.match(page,/loading=\{updateSettings\.isPending\}/);
  assert.match(page,/loading=\{agencyActions\.create\.isPending\}/);
});

test('SETTINGS-FE-08 aucune autorisation par rôle ni rendu HTML dangereux',()=>{
  for(const role of ['DIRECTOR','DIRECTION','MANAGER','ADMIN','ACCOUNTANT'])assert.doesNotMatch(page,new RegExp(`role.*${role}|${role}.*role`,'i'));
  assert.doesNotMatch(page,/dangerouslySetInnerHTML/);
  assert.doesNotMatch(resources,/dangerouslySetInnerHTML/);
});
