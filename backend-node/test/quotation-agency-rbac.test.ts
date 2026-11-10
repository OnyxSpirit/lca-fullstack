import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const routes=readFileSync(new URL('../src/modules/quotations/quotation.routes.ts',import.meta.url),'utf8');
const service=readFileSync(new URL('../src/modules/quotations/quotation.service.ts',import.meta.url),'utf8');

test('QUOTATION-AGENCY-01 les onze routes exigent OWN/AGENCY',()=>{
  assert.equal([...routes.matchAll(/quotationRouter\.(?:get|post|patch|put|delete)\(/g)].length,11);
  assert.equal([...routes.matchAll(/requireAgencyBusinessPermission\('/g)].length,11);
  assert.doesNotMatch(routes,/requirePermission\(|request\.user!?\.agencyId/);
});

test('QUOTATION-AGENCY-02 la portée ne reconnaît que OWN et AGENCY',()=>{
  assert.match(service,/agencyRbac\?\.activeAgencyId/);
  assert.match(service,/COALESCE\(o\.assigned_user_id,\$\{alias\}\.created_by\)=\?/);
  assert.doesNotMatch(service,/value==='GLOBAL'|value==='CONCESSION'|request\.rbac/);
});

test('QUOTATION-AGENCY-03 les écritures utilisent une autorisation fraîche',()=>{
  assert.match(service,/withCurrentAgencyBusinessAuthorization\(request,'quotations\.create'/);
  assert.match(service,/withCurrentAgencyBusinessAuthorization\(request,'quotations\.update'/);
  assert.match(service,/withCurrentAgencyBusinessAuthorization\(request,'quotations\.validate'/);
  assert.match(service,/withCurrentAgencyBusinessAuthorization\(request,'quotations\.cancel'/);
  assert.match(service,/FOR UPDATE/);
  assert.doesNotMatch(service,/\btransaction\(/);
});

test('QUOTATION-AGENCY-04 provenance CRM et permissions additionnelles sont fraîches',()=>{
  assert.match(service,/l\.agency_id/);
  assert.doesNotMatch(service,/COALESCE\(assignee\.agency_id,creator\.agency_id\)/);
  assert.match(service,/assertAgencyBusinessPermissionInContext\(context,'sales\.tax\.override'\)/);
  assert.match(service,/assertAgencyBusinessPermissionInContext\(context,'quotations\.discount\.manage'\)/);
});
