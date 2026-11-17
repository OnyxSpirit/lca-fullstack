import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { canNavigateWithPermissions } from '../src/navigation/permissions';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('SET-TEST-01..03 affiche les paramètres en lecture et réserve les actions aux permissions',()=>{
  const page=source('src/modules/settings/SettingsPage.tsx'),rates=source('src/modules/settings/WorkshopLaborRatesSettings.tsx');
  assert.match(page,/<CardTitle>Barèmes horaires atelier/);
  assert.match(page,/input disabled={!admin}/);
  assert.match(rates,/canEditConcession/);
  assert.match(rates,/canUpdate=can\('settings\.workshop_rates\.manage'\)&&permissionScope==='AGENCY'/);
  assert.match(rates,/canEditConcession=canUpdate/);
  assert.match(rates,/mayChooseAgency=false/);
  assert.match(page,/can\('parts\.suppliers\.view'\)/);
  assert.doesNotMatch(page,/PARTS_MANAGER|hasPermission\(roles/);
});

test('PERM-TEST-01 la navigation utilisateurs dépend de users.view',()=>{
  assert.equal(canNavigateWithPermissions({'users.view':'AGENCY'},'/users'),true);
  assert.equal(canNavigateWithPermissions({},'/users'),false);
});

test('la navigation notification utilise les permissions reçues',()=>{const page=source('src/modules/notifications/NotificationsPage.tsx');assert.match(page,/canNavigateWithPermissions/);assert.doesNotMatch(page,/visibleNotificationTypes|currentUser\.roles/)});
