import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = source('database/migrations/133_service_stamp_agency_assignments.sql');
const routes = source('src/modules/document-marks/document-mark.routes.ts');
const delivery = source('src/modules/deliveries/delivery.routes.ts');
const central = source('src/modules/rbac/agency-authorization.ts');
const policy = source('src/modules/document-marks/document-mark-policy.service.ts');

test('CORRECTIF-ERP-GLOBAL-01 migration additive, restrictive et sans attribution arbitraire', () => {
  assert.match(migration, /CREATE TABLE service_stamp_agencies/);
  assert.match(migration, /PRIMARY KEY \(stamp_id,agency_id\)/);
  assert.match(migration, /KEY idx_service_stamp_agency_access \(agency_id,stamp_id\)/);
  assert.match(migration, /ON DELETE RESTRICT/g);
  assert.match(migration, /SELECT id,agency_id,created_by FROM service_stamps WHERE agency_id IS NOT NULL/);
  assert.doesNotMatch(migration, /UPDATE service_stamps SET agency_id|DELETE FROM service_stamps/);
  assert.match(migration, /stamp\.assign_agencies/);
  assert.doesNotMatch(migration, /'(GLOBAL|CONCESSION)'/);
});

test('le propriétaire vient exclusivement de l’agence active et les affectations sont transactionnelles', () => {
  assert.match(routes, /ownerAgencyId=String\(r\.user!\.agencyId\)/);
  assert.doesNotMatch(routes, /ownerAgencyId=.*body\.agencyId/);
  assert.match(routes, /validateAssignments\(c,r,ownerAgencyId,requestedAgencies\)/);
  assert.match(routes, /INSERT INTO service_stamp_agencies/);
  assert.match(routes, /stamp\.agencies\.updated/);
  assert.match(routes, /agency_id=\? FOR UPDATE/);
  assert.match(routes, /stamp\.assign_agencies/);
});

test('visibilité et utilisation exigent une affectation explicite à l’agence active', () => {
  assert.match(routes, /EXISTS\(SELECT 1 FROM service_stamp_agencies sa_scope/);
  assert.match(delivery, /JOIN service_stamp_agencies sa ON sa\.stamp_id=st\.id AND sa\.agency_id=\?/);
  assert.match(policy, /JOIN service_stamp_agencies sa ON sa\.stamp_id=st\.id AND sa\.agency_id=\?/);
  assert.match(policy, /user_agency_roles/);
});

test('les ressources centrales délégables reposent sur permission AGENCY', () => {
  assert.match(central, /assertCentralAgencyPermissionInContext/);
  assert.match(central, /scope!=='AGENCY'/);
  assert.doesNotMatch(central, /Permission centrale réservée au Super Administrateur/);
  assert.match(central, /assertSystemSuperAdminPermissionInContext/);
});
