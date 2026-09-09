import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('RBAC personnel utilise un rôle métier exclusif',()=>{
  const page=read('../src/modules/users/UsersManagementPage.tsx');
  assert.doesNotMatch(page,/type="checkbox"/);
  assert.match(page,/roles:e\.target\.value\?\[e\.target\.value\]:\[\]/);
});

test('RBAC Comptable conserve la facturation sans exposition SAV',()=>{
  const permissions=read('../src/navigation/permissions.ts');
  const accountant=permissions.match(/ACCOUNTANT:\[(.*?)\],\n/s)?.[1]??'';
  assert.match(accountant,/billing/);
  assert.doesNotMatch(accountant,/'service'/);
  assert.doesNotMatch(accountant,/sales\.update|sales\.cancel/);
});

test('Commercial, Responsable commercial et Comptable voient les actions conformes',()=>{
	const page=read('../src/modules/sales/SaleDetailPage.tsx');
  assert.match(page,/canUpdateSale=hasPermission\(roles,'sales\.update'\)/);
  assert.match(page,/canCancelSale=hasPermission\(roles,'sales\.cancel'\)/);
  assert.match(page,/canFinalizeCommercial=roles\.some/);
  assert.match(page,/!isReadyTransition\|\|canFinalizeCommercial/);
  assert.match(page,/disabled=\{isReadyTransition&&readyBlocked\}/);
});

test('PAY double clic désactive immédiatement la validation et conserve une intention',()=>{
  const page=read('../src/modules/billing/InvoiceDetailPage.tsx');
  assert.match(page,/pending=pay\.isPending\|\|action\.isPending/);
  assert.match(page,/props\.type==='submit'&&pending/);
  assert.match(page,/idempotencyKey:operationKey/);
  assert.match(page,/setOperationKey\(generateUuid\(\)\)/);
});

test('VEH-SOLD stock actif par défaut, vues historiques et sélecteurs disponibles',()=>{
  const list=read('../src/modules/vehicles/VehiclesListPage.tsx');
  const crm=read('../src/modules/crm/QuotationModal.tsx');
  const drive=read('../src/modules/crm/CrmTestDriveModal.tsx');
  const sale=read('../src/modules/sales/SaleWizardModal.tsx');
  assert.match(list,/useState<'active'\|'sold'\|'all'>\('active'\)/);
  assert.match(list,/Vendus \/ livrés/);
  assert.match(crm,/status:'available'/);
  assert.match(drive,/status:'available'/);
  assert.match(sale,/v\.status==='DISPONIBLE'/);
});
