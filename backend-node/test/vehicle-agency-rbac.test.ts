import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');

test('VEHICLE-AGENCY-01 les 22 routes ont une garde métier agence',()=>{
  assert.equal([...source.matchAll(/vehicleRouter\.(?:get|post|patch|put|delete)\(/g)].length,22);
  assert.equal([...source.matchAll(/requireAgencyBusinessPermission\(|requireAnyAgencyBusinessPermission\(/g)].length,22);
  assert.doesNotMatch(source,/requirePermission\(|request\.rbac|request\.user\?\.agencyId/);
});

test('VEHICLE-AGENCY-02 le stock refuse OWN et les scopes historiques',()=>{
  assert.match(source,/stock véhicules ne possède pas de règle OWN/);
  assert.doesNotMatch(source,/value==='GLOBAL'|value==='CONCESSION'|scoped==='GLOBAL'|scoped==='CONCESSION'/);
  assert.match(source,/agencyRbac\?\.activeAgencyId/);
});

test('VEHICLE-AGENCY-03 les écritures revalident et verrouillent',()=>{
  assert.match(source,/withCurrentAgencyBusinessAuthorization\(request,'vehicles\.create'/);
  assert.match(source,/withCurrentAgencyBusinessAuthorization\(request,'vehicles\.update'/);
  assert.match(source,/withCurrentAgencyBusinessAuthorization\(request,'vehicles\.status\.update'/);
  assert.match(source,/withCurrentAgencyBusinessAuthorization\(request,'vehicles\.images\.manage'/);
  assert.match(source,/FOR UPDATE/);
  assert.doesNotMatch(source,/\btransaction\(|(?<!\.)\bexecute\(/);
});

test('VEHICLE-AGENCY-04 transfert inter-agences fermé sans règle destination',()=>{
  assert.match(source,/transferts inter-agences exigent une autorisation destination explicite non configurée/);
  assert.match(source,/toAgencyId!==context\.activeAgencyId/);
  assert.doesNotMatch(source,/UPDATE vehicles SET agency_id=/);
});

test('VEHICLE-AGENCY-05 profil catalogue commun reste central explicite',()=>{
  assert.match(source,/assertCentralAgencyPermission\(request,'vehicles\.catalog\.manage'\)/);
});
