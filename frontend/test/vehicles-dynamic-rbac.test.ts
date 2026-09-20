import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('VEH-17/18/19 : créer, modifier, images et statut dépendent de can(permission)',()=>{
  const list=read('../src/modules/vehicles/VehiclesListPage.tsx');
  const detail=read('../src/modules/vehicles/VehicleDetailPage.tsx');
  assert.match(list,/canCreate=can\('vehicles\.create'\)/);
  assert.match(list,/\{canCreate&&/);
  assert.match(detail,/canEdit=can\('vehicles\.update'\)/);
  assert.match(detail,/canManageImages=can\('vehicles\.images\.manage'\)/);
  assert.match(detail,/canChangeStatus=can\('vehicles\.status\.update'\)/);
  assert.match(detail,/canChangeStatus&&manualStatusOptions\.length>0/);
});

test('VEH-20 : la route et le portail utilisent les permissions dynamiques du profil',()=>{
  const app=read('../src/App.tsx');
  const portal=read('../src/modules/modules-portal/ModulesPortalPage.tsx');
  assert.match(app,/vehicles:'vehicles\.view'/);
  assert.match(portal,/can\('vehicles\.financials\.view'\)/);
});

test('les actions rapides Véhicules ne contiennent plus de whitelist de rôles',()=>{
  const quick=read('../src/components/layout/QuickActionModal.tsx');
  const dashboard=read('../src/modules/dashboard/DashboardPage.tsx');
  assert.match(quick,/canCreateVehicle=can\('vehicles\.create'\)/);
  assert.doesNotMatch(quick,/WAREHOUSE_CLERK|SALES_MANAGER|DIRECTION/);
  assert.match(dashboard,/can\('vehicles\.create'\)/);
});

test('le frontend résout les URL /uploads sur l’origine backend',()=>{
  const hooks=read('../src/api/erpHooks.ts');
  const client=read('../src/services/apiClient.ts');
  assert.match(hooks,/assetUrl/); assert.match(client,/VITE_API_URL/); assert.match(client,/API_ORIGIN/);
});

test('les statuts réservée, vendue et livrée ne sont jamais proposés manuellement',()=>{
  const detail=read('../src/modules/vehicles/VehicleDetailPage.tsx');
  assert.match(detail,/DISPONIBLE:\['PREPARATION'\]/);
  assert.match(detail,/VENDU:\[\],LIVRE:\[\]/);
  assert.doesNotMatch(detail,/DISPONIBLE:\[[^\]]*'VENDU'/);
});
