import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../src/modules/proformas/proforma.routes.ts',import.meta.url),'utf8');

test('PROFORMA-AGENCY-01 les sept routes exigent OWN/AGENCY',()=>{
  assert.equal([...source.matchAll(/proformaRouter\.(?:get|post|patch|put|delete)\(/g)].length,6);
  assert.equal([...source.matchAll(/requireAgencyBusinessPermission\('/g)].length,6);
  assert.doesNotMatch(source,/requirePermission\(|request\.rbac|request\.user!?\.?agencyId|GLOBAL|CONCESSION/);
});

test('PROFORMA-AGENCY-02 les listes et ressources sont liées à agence et responsable',()=>{
  assert.match(source,/agencyRbac\?\.activeAgencyId/);
  assert.match(source,/agency_id=\? AND \$\{alias\}\.responsible_user_id=\?/);
  assert.match(source,/q\.agency_id,o\.assigned_user_id responsible_user_id/);
});

test('PROFORMA-AGENCY-03 toutes les mutations revalident et verrouillent',()=>{
  assert.equal([...source.matchAll(/withCurrentAgencyBusinessAuthorization\(/g)].length,3);
  assert.match(source,/FROM proformas WHERE id=\? FOR UPDATE/);
  assert.match(source,/FROM customers WHERE id=\? FOR UPDATE/);
  assert.match(source,/assertAgencyBusinessPermissionInContext\(context,'sales\.tax\.override'\)/);
  assert.doesNotMatch(source,/\btransaction\(/);
});

test('PROFORMA-AGENCY-04 les opportunités utilisent la provenance CRM directe',()=>{
  assert.match(source,/l\.agency_id FROM opportunities/);
  assert.doesNotMatch(source,/COALESCE\(assignee\.agency_id,creator\.agency_id\)/);
});
