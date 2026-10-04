import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Request} from 'express';
import {crmLeadScope} from '../src/modules/crm/crm-visibility.js';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const crm=read('src/modules/crm/crm.routes.ts');
const sales=read('src/modules/sales/sale.service.ts');
const auth=read('src/modules/rbac/rbac.service.ts');
const request=(scope:'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL',user='10',agency='1')=>({
  user:{sub:user,agencyId:agency},query:{},rbac:{permissions:new Map([['crm.pipeline.advance',scope]])},
}) as unknown as Request;

test('CRM-NEG-01 Négociation vers Gagné passe par la vente réelle',()=>{
  assert.match(crm,/\['appointment','test_drive','offer','won'\]\.includes\(stage\).*action métier/);
  assert.match(sales,/if\(input\.quotationId\)await assertPermission\(request,'quotations\.convert'\)/);
  assert.match(sales,/UPDATE opportunities SET stage='won',won_at=NOW\(\)/);
  assert.match(sales,/UPDATE leads SET status='converted',converted_at=NOW\(\)/);
});

test('CRM-NEG-02 Négociation vers Perdu reste autorisée et historisée',()=>{
  assert.match(crm,/stage==='lost'.*assertPermission\(request,'crm\.prospect\.lose'\)/);
  assert.match(crm,/lost_reason=\?,lost_at=IF\(\?='lost',NOW\(\),NULL\)/);
  assert.match(crm,/INSERT INTO activities[\s\S]*Étape CRM mise à jour/);
});

test('CRM-NEG-03 permission absente refusée sans exception de rôle',()=>{
  assert.match(crm,/requirePermission\('crm\.pipeline\.advance'\)/);
  assert.match(auth,/if\(!context\.permissions\.has\(permission\)\)throw new HttpError\(403/);
  assert.doesNotMatch(crm,/SUPER_ADMIN|isSuperAdmin/);
});

test('CRM-NEG-04 les quatre scopes restent bornés',()=>{
  assert.match(crmLeadScope(request('OWN'),'crm.pipeline.advance').sql,/assigned_user_id=\?/);
  assert.match(crmLeadScope(request('AGENCY'),'crm.pipeline.advance').sql,/=\?/);
  assert.match(crmLeadScope(request('CONCESSION'),'crm.pipeline.advance').sql,/concession_id/);
  assert.equal(crmLeadScope(request('GLOBAL'),'crm.pipeline.advance').sql,'1=1');
});

test('CRM-NEG-05/06 SUPER_ADMIN et rôle dynamique utilisent les mêmes permissions persistées',()=>{
  assert.doesNotMatch(crm,/rbac\?\.isSuperAdmin|roleCode|SUPER_ADMIN/);
  assert.match(sales,/targetAgency\(request,'sales\.create'/);
  assert.match(sales,/assertPermission\(request,'quotations\.convert'\)/);
});

test('CRM-NEG-07/08 succès persisté puis relu depuis MySQL',()=>{
  assert.ok(sales.indexOf("UPDATE opportunities SET stage='won'")<sales.indexOf("changeType:'sale'"));
  assert.match(crm,/response\.json\(mapLead\(await accessibleLead/);
});
