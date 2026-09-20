import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('CRM affiche les actions avec les permissions dynamiques',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx');
  for(const permission of ['crm.prospect.create','crm.prospect.update','crm.prospect.assign','crm.pipeline.advance','crm.prospect.lose','crm.activity.view','crm.activity.create','crm.appointment.create','crm.test_drive.create','quotations.create'])assert.match(page,new RegExp(`can\\('${permission.replaceAll('.','\\.')}'\\)`));
  assert.doesNotMatch(page,/roles\.includes|roles\.some|isSalesManager|isReceptionist|SALES_AGENT|SALES_MANAGER|RECEPTIONIST|DIRECTION|DIRECTOR/);
  assert.match(page,/\{canCreateLead&&<Button/);
  assert.match(page,/\(canUpdateLead\|\|canAssignLead\)&&<Button/);
});

test('le formulaire de création ne déduit plus l’affectation depuis un rôle',()=>{
  const modal=read('../src/modules/crm/NewLeadModal.tsx');
  assert.match(modal,/state\.can\('crm\.prospect\.assign'\)/);
  assert.doesNotMatch(modal,/roles\.includes|SALES_MANAGER|RECEPTIONIST|DIRECTION|DIRECTOR/);
});

test('la chronologie CRM ne charge pas sans crm.activity.view',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx'),hooks=read('../src/api/erpHooks.ts');
  assert.match(page,/useLeadActivitiesQuery\(selectedLead\?\.id,canViewActivities\)/);
  assert.match(hooks,/useLeadActivitiesQuery=\(leadId\?:string,requestEnabled=true\)/);
});

test('CRM-15 la route CRM est gardée par crm.prospect.view et accepte les permissions dynamiques',()=>{
  const app=read('../src/App.tsx'),auth=read('../src/stores/authStore.ts');
  assert.match(app,/ModuleGuard module="crm"/);
  assert.match(auth,/hasDynamicPermission\(get\(\)\.currentUser\?\.permissions,permissionCode\)/);
  assert.doesNotMatch(auth,/can:.*ROLE_PERMISSIONS/);
});
