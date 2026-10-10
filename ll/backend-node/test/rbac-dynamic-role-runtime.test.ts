import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {assertDelegablePermissions,can,type RbacContext} from '../src/modules/rbac/rbac.service.js';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const role=(permissions:Record<string,'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL'|null>,code='ROLE-RBAC-RECETTE-9381'):RbacContext=>({roleId:'9381',roleCode:code,isSuperAdmin:false,permissions:new Map(Object.entries(permissions))});

test('RBAC-08 rôle inconnu : ajout, scope et retrait pilotent seuls l’accès',()=>{
  const granted=role({'parts.stock.view':'AGENCY','workshop.schedule.view':'OWN','crm.prospect.view':'CONCESSION'});
  assert.equal(can(granted,'parts.stock.view'),true);
  assert.equal(granted.permissions.get('parts.stock.view'),'AGENCY');
  assert.equal(can(role({}),'parts.stock.view'),false);
  assert.doesNotMatch(source('src/modules/rbac/rbac.service.ts'),/ROLE-RBAC-RECETTE-9381/);
});

test('RBAC-09 GLOBAL reste une portée de permission et non un statut Super Admin',()=>{
  const globalRole=role({'parts.stock.view':'GLOBAL'});
  assert.equal(globalRole.isSuperAdmin,false);
  assert.equal(can(globalRole,'parts.stock.view'),true);
  assert.equal(can(globalRole,'roles.permissions.manage'),false);
});

test('RBAC-10 un faux code SUPER_ADMIN sans is_system ne contourne rien',()=>{
  const forged=role({},'SUPER_ADMIN');
  assert.equal(forged.isSuperAdmin,false);
  assert.equal(can(forged,'roles.create'),false);
});

test('RBAC-11 un administrateur limité ne délègue ni permission absente ni scope supérieur',()=>{
  const limited=role({'parts.stock.view':'AGENCY'});
  assert.throws(()=>assertDelegablePermissions(limited,[{code:'parts.stock.adjust',scope:'AGENCY'}]));
  assert.throws(()=>assertDelegablePermissions(limited,[{code:'parts.stock.view',scope:'GLOBAL'}]));
});

test('RBAC-12 Settings et GED n’autorisent plus par nom de rôle',()=>{
  const settings=source('src/modules/settings/setting.routes.ts'),documents=source('src/modules/documents/document.routes.ts'),access=source('src/modules/documents/document-access.ts');
  assert.doesNotMatch(settings,/authorize\(|DIRECTOR/);
  assert.match(settings,/requirePermission\('settings\.update'\)/);
  assert.doesNotMatch(documents,/authorize\(|READ_ROLES|UPLOAD_ROLES|ARCHIVE_ROLES/);
  assert.doesNotMatch(access,/SALES_MANAGER|PARTS_MANAGER|DIRECTOR/);
});

test('RBAC-13 Reporting utilise reporting.view/export sans matrice de rôles',()=>{
  const reports=source('src/modules/reports/report.routes.ts');
  assert.match(reports,/requirePermission\('reporting\.view'\)/);
  assert.match(reports,/requirePermission\('reporting\.export'\)/);
  assert.doesNotMatch(reports,/authorize\(|SALES_MANAGER|DIRECTOR|PARTS_MANAGER/);
});


test('le PDF vente utilise les mêmes permissions et scopes que la consultation',()=>{
  const core=source('src/modules/core/core.routes.ts');
  assert.match(core,/requirePermission\('sales.view'\)/);
  assert.match(core,/await accessibleSale\(String\(request.params.id\),request\)/);
  assert.doesNotMatch(core,/authorize\(|DIRECTOR|SALES_AGENT/);
});
