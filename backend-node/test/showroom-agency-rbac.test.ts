import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../src/modules/showroom/showroom.routes.ts',import.meta.url),'utf8');

test('SHOWROOM-AGENCY-01 toutes les routes métier exigent un scope agence OWN/AGENCY',()=>{
  const routes=[...source.matchAll(/showroomRouter\.(?:get|post|patch|put|delete)\(/g)];
  const guards=[...source.matchAll(/requireAgencyBusinessPermission\('/g)];
  assert.equal(routes.length,18);
  assert.equal(guards.length,18);
  assert.doesNotMatch(source,/requirePermission\(|assertPermission\(/);
});

test('SHOWROOM-AGENCY-02 aucun scope historique ne peut élargir les données',()=>{
  assert.doesNotMatch(source,/grant==='(?:GLOBAL|CONCESSION)'|level==='(?:GLOBAL|CONCESSION)'/);
  assert.match(source,/\['OWN','AGENCY'\]/);
  assert.match(source,/activeAgencyId/);
});

test('SHOWROOM-AGENCY-03 les affectations commerciales sont propres à agence',()=>{
  for(const token of ['JOIN user_agencies ua','JOIN user_agency_roles uar',"ua.status='ACTIVE'","r.is_system=FALSE","rp.scope IN('OWN','AGENCY')"])assert.ok(source.includes(token),token);
  assert.doesNotMatch(source,/FROM users u JOIN user_roles/);
});

test('SHOWROOM-AGENCY-04 les écritures revalident le contexte dans leur transaction',()=>{
  assert.match(source,/withCurrentAgencyBusinessAuthorization\(/);
  assert.match(source,/withCurrentAgencyBusinessAuthorizationRetry\(/);
  assert.match(source,/FOR UPDATE/);
  assert.doesNotMatch(source,/import \{[^}]*\b(?:transaction|transactionWithDeadlockRetry|execute)\b[^}]*\} from '..\/..\/config\/database/);
});

test('SHOWROOM-AGENCY-05 les prospects CRM portent une provenance agence directe',()=>{
  assert.match(source,/leads l[\s\S]*l\.agency_id/);
  assert.match(source,/INSERT INTO leads\(customer_id,agency_id,/);
  assert.doesNotMatch(source,/COALESCE\(assignee\.agency_id,creator\.agency_id\)/);
});
