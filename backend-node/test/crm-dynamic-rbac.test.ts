import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Request} from 'express';
import {crmLeadScope} from '../src/modules/crm/crm.routes.js';
import {assertPermission} from '../src/modules/rbac/rbac.service.js';
import {HttpError} from '../src/shared/http-error.js';

const request=(scope:'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL',userId='10',agencyId='1')=>({
  query:{},
  user:{sub:userId,agencyId,roles:['ARBITRARY_ROLE']},
  rbac:{roleId:'9',roleCode:'ARBITRARY_ROLE',isSuperAdmin:false,permissions:new Map([['crm.prospect.update',scope],['crm.prospect.view',scope]])},
}) as unknown as Request;

test('CRM OWN repose exclusivement sur leads.assigned_user_id',()=>{
  const clause=crmLeadScope(request('OWN'),'crm.prospect.update');
  assert.match(clause.sql,/l\.assigned_user_id=\?/);
  assert.deepEqual(clause.params,['1','10']);
  assert.doesNotMatch(clause.sql,/created_by/);
});

test('CRM-01/06/07/08/16 une permission absente est refusée',async()=>{
  const denied=request('OWN');denied.rbac!.permissions.clear();
  for(const permission of ['crm.prospect.view','crm.prospect.create','crm.prospect.update','crm.prospect.assign','crm.pipeline.advance'])await assert.rejects(()=>assertPermission(denied,permission),(error:unknown)=>error instanceof HttpError&&error.status===403);
});

test('CRM AGENCY, CONCESSION et GLOBAL produisent des périmètres distincts',()=>{
  assert.equal(crmLeadScope(request('AGENCY'),'crm.prospect.update').sql,'COALESCE(u.agency_id,creator.agency_id)=?');
  assert.match(crmLeadScope(request('CONCESSION'),'crm.prospect.update').sql,/concession_id/);
  assert.equal(crmLeadScope(request('GLOBAL'),'crm.prospect.update').sql,'1=1');
});

test('CRM-02/03/04/05/10/17 les scopes sont évalués permission par permission pour un rôle arbitraire',async()=>{
  const dynamic=request('OWN');
  dynamic.rbac!.roleCode='CRM_TEST_DYNAMIC';
  assert.equal(await assertPermission(dynamic,'crm.prospect.view'),'OWN');
  dynamic.rbac!.permissions.set('crm.prospect.view','AGENCY');assert.match(crmLeadScope(dynamic,'crm.prospect.view').sql,/agency_id/);
  dynamic.rbac!.permissions.set('crm.prospect.view','CONCESSION');assert.match(crmLeadScope(dynamic,'crm.prospect.view').sql,/concession_id/);
  dynamic.rbac!.permissions.set('crm.prospect.view','GLOBAL');assert.equal(crmLeadScope(dynamic,'crm.prospect.view').sql,'1=1');
  dynamic.rbac!.permissions.set('crm.pipeline.advance','OWN');assert.equal(await assertPermission(dynamic,'crm.pipeline.advance'),'OWN');
});

test('CRM-11/12 DIRECTOR n’a aucun bypass, seul SUPER_ADMIN système est global',async()=>{
  const director=request('OWN');director.rbac!.roleCode='DIRECTOR';director.rbac!.permissions.clear();
  await assert.rejects(()=>assertPermission(director,'crm.prospect.view'),(error:unknown)=>error instanceof HttpError&&error.status===403);
  const superAdmin=request('OWN');superAdmin.rbac!.roleCode='SUPER_ADMIN';superAdmin.rbac!.isSuperAdmin=true;superAdmin.rbac!.permissions.clear();
  assert.equal(await assertPermission(superAdmin,'crm.prospect.view'),'GLOBAL');
});

test('les routes CRM utilisent uniquement les permissions dynamiques',()=>{
  const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
  for(const permission of ['crm.prospect.view','crm.prospect.create','crm.prospect.update','crm.prospect.assign','crm.pipeline.advance','crm.prospect.lose','crm.activity.view','crm.activity.create','crm.appointment.create'])assert.match(source,new RegExp(permission.replaceAll('.','\\.')));
  assert.doesNotMatch(source,/authorize\(|hasRole\(|SALES_AGENT|SALES_MANAGER|RECEPTIONIST|DIRECTOR/);
  assert.match(source,/requireAnyPermission\(\['crm\.prospect\.update','crm\.prospect\.assign'\]\)/);
  assert.match(source,/Object\.hasOwn\(body,'assignedUserId'\).*assertPermission\(request,'crm\.prospect\.assign'\)/s);
});

test('l’éligibilité à l’affectation CRM repose sur des permissions actives',()=>{
  const source=readFileSync(new URL('../src/modules/crm/crm-assignment.ts',import.meta.url),'utf8');
  assert.match(source,/p\.code IN\('sales\.create','crm\.prospect\.update'\)/);
  assert.match(source,/r\.is_active=TRUE/);
  assert.doesNotMatch(source,/COMMERCIAL_ROLES|SALES_AGENT|SALES_MANAGER/);
});

test('l’essai lancé depuis le CRM exige aussi crm.test_drive.create',()=>{
  const source=readFileSync(new URL('../src/modules/showroom/showroom.routes.ts',import.meta.url),'utf8');
  assert.match(source,/assertPermission\(request,'crm\.test_drive\.create'\)/);
  assert.match(source,/crmScope==='OWN'/);
});
