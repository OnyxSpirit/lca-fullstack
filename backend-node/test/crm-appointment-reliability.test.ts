import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const crm=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../database/migrations/077_crm_appointment_reliability.sql',import.meta.url),'utf8');

test('CRM-04 verrouille le commercial et refuse les chevauchements',()=>{
  assert.match(crm,/SELECT id FROM users WHERE id=\? FOR UPDATE/);
  assert.match(crm,/DATE_ADD\(f\.scheduled_at,INTERVAL COALESCE\(f\.duration_minutes,30\) MINUTE\)>\?/);
  assert.match(crm,/CRM_APPOINTMENT_CONFLICT/);
});

test('CRM-04 exige permission et motif pour forcer un conflit',()=>{
  assert.match(crm,/assertPermission\(request,'crm\.appointment\.override_conflict'\)/);
  assert.match(crm,/La justification du chevauchement est obligatoire/);
  assert.match(migration,/conflict_override_reason/);
  assert.match(migration,/conflict_snapshot JSON/);
});

test('CRM-05 sépare auteur et responsable sans réécrire l’historique',()=>{
  assert.match(migration,/ADD COLUMN created_by BIGINT UNSIGNED NULL/);
  assert.doesNotMatch(migration,/UPDATE activities/);
  assert.match(crm,/created_by_name/);
});

test('API-01 applique les règles particulier et entreprise',()=>{
  assert.match(crm,/Le prénom et le nom sont obligatoires pour un particulier/);
  assert.match(crm,/La raison sociale est obligatoire pour une entreprise/);
  assert.match(crm,/Un téléphone ou un e-mail est requis/);
});
