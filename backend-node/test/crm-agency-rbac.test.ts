import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const routes=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
const assignment=readFileSync(new URL('../src/modules/crm/crm-assignment.ts',import.meta.url),'utf8');
const visibility=readFileSync(new URL('../src/modules/crm/crm-visibility.ts',import.meta.url),'utf8');
const realtime=readFileSync(new URL('../src/modules/crm/crm.realtime.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../database/migrations/116_crm_lead_agency_provenance.sql',import.meta.url),'utf8');

test('CRM multi-agences utilise une provenance d’agence persistée',()=>{
  assert.match(migration,/ADD COLUMN agency_id/);
  assert.match(migration,/FOREIGN KEY \(agency_id\) REFERENCES agencies\(id\)/);
  assert.equal(visibility.includes('COALESCE(${ownerAlias}.agency_id'),false);
  assert.match(visibility,/`l\.agency_id`/);
  assert.match(routes,/INSERT INTO leads\(agency_id,/);
});

test('les douze routes CRM utilisent les guards métier OWN\/AGENCY',()=>{
  assert.equal((routes.match(/crmRouter\.(?:get|post|patch|put|delete)\(/g)??[]).length,12);
  assert.doesNotMatch(routes,/requirePermission\(|requireAnyPermission\(/);
  assert.match(routes,/requireAgencyBusinessPermission/);
  assert.match(routes,/requireAnyAgencyPermission/);
});

test('toutes les écritures CRM revalident le contexte et verrouillent le prospect',()=>{
  assert.doesNotMatch(routes,/\btransaction\(/);
  assert.doesNotMatch(routes,/import \{[^}]*\bexecute\b[^}]*\} from '..\/..\/config\/database/);
  assert.match(routes,/withCurrentAgencyAuthorization/);
  assert.match(routes,/withLockedLeadAuthorization/);
  assert.match(routes,/WHERE l\.id=\? FOR UPDATE/);
  assert.match(routes,/assertAgencyBusinessPermissionInContext/);
});

test('les affectataires proviennent des rôles de l’agence active',()=>{
  assert.match(assignment,/JOIN user_agencies/);
  assert.match(assignment,/JOIN user_agency_roles/);
  assert.match(assignment,/ua\.agency_id=\?/);
  assert.doesNotMatch(assignment,/JOIN user_roles/);
  assert.doesNotMatch(assignment,/u\.agency_id=\?/);
});

test('le hint temps réel est borné par agence active et scopes métier',()=>{
  assert.match(realtime,/JOIN user_agencies/);
  assert.match(realtime,/rp\.scope IN\('OWN','AGENCY'\)/);
  assert.match(realtime,/emitToUserAgencyContext/);
  assert.doesNotMatch(realtime,/emitToUser\(/);
});
