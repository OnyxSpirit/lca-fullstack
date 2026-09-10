import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('TEST-DRIVE-03 le CRM affiche l’essai en cours et désactive le devis avec explication',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx');
  assert.match(page,/Essai en cours/);
  assert.match(page,/disabled=\{!selectedLead\.canCreateQuotation\}/);
  assert.match(page,/En attente du retour de l’essai routier\./);
  assert.match(page,/canIssueQuotation/);
});

test('TEST-DRIVE-05 le retour débloque le devis et synchronise Showroom, CRM et véhicules',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx'),hooks=read('../src/api/erpHooks.ts'),bootstrap=read('../src/components/AppBootstrap.tsx');
  assert.match(page,/selectedLead\.canCreateQuotation\?'Essai terminé':'Essai en cours'/);
  const completeDrive=hooks.slice(hooks.indexOf('completeDrive: useMutation'),hooks.indexOf('cancelDrive: useMutation'));
  assert.match(completeDrive,/erpKeys\.leads/);
  assert.match(completeDrive,/erpKeys\.vehicles/);
  assert.match(bootstrap,/event==='showroom:test-drive-completed'/);
  assert.match(bootstrap,/queryKey:erpKeys\.leads/);
});

test('TEST-DRIVE-08 départ commercial et confirmation physique du retour utilisent des permissions distinctes',()=>{
  const showroom=read('../src/modules/showroom/ShowroomPage.tsx'),permissions=read('../src/navigation/permissions.ts');
  assert.match(showroom,/canManageTestDrive=canPerformWorkflowAction\(roles,'showroom\.testDrive'\)/);
  assert.match(showroom,/canReturnTestDrive=canPerformWorkflowAction\(roles,'showroom\.returnTestDrive'\)/);
  assert.match(permissions,/showroom\.returnTestDrive/);
  assert.match(permissions,/\['SUPER_ADMIN','DIRECTION','SALES_MANAGER','RECEPTIONIST'\]/);
});

test('l’état du retour est lu depuis le backend, pas reconstruit artificiellement',()=>{
  const hooks=read('../src/api/erpHooks.ts'),types=read('../src/types/index.ts');
  assert.match(hooks,/testDriveStatus: r\.testDriveStatus \?\? null/);
  assert.match(hooks,/canCreateQuotation: Boolean\(r\.canCreateQuotation\)/);
  assert.match(types,/testDriveStatus\?: 'planned' \| 'in_progress' \| 'completed' \| 'cancelled'/);
});
