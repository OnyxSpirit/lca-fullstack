import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const ged = read('../frontend/src/modules/settings/DocumentReferencesSettings.tsx');
const contractManager = read('../frontend/src/modules/hr/ContractTypesManager.tsx');
const contractForm = read('../frontend/src/modules/hr/EmployeeContractsSection.tsx');
const routes = read('src/modules/hr/hr-contract.routes.ts');
const migration = read('database/migrations/065_employee_contract_history.sql');

test('GED : les modifications catégorie/type utilisent les modales accessibles', () => {
  assert.doesNotMatch(ged, /window\.prompt|\bprompt\(/);
  assert.match(ged, /Modifier la catégorie documentaire/);
  assert.match(ged, /Modifier le type de document/);
  assert.match(ged, /data-autofocus/);
  assert.match(ged, /role="alert"/);
  assert.match(ged, /actions\.updateCategory\.isPending/);
  assert.match(ged, /actions\.updateType\.isPending/);
  for (const field of ['categoryId', 'code', 'name', 'displayOrder']) assert.match(ged, new RegExp(field));
});

test('RH : le référentiel existant est administrable sans liste juridique codée en dur', () => {
  for (const label of ['Types de contrats', 'Nouveau type de contrat', 'Modifier', 'Désactiver', 'Réactiver']) assert.match(contractManager, new RegExp(label));
  assert.doesNotMatch(contractManager, /\bCDI\b|\bCDD\b|Apprentissage|Prestation/);
  assert.match(contractManager, /editing\?\.is_used/);
  assert.match(contractManager, /actions\.contractType\.isPending/);
  assert.match(routes, /hr\.contract\.type\.manage/);
  assert.match(routes, /scope==='OWN'\|\|scope==='AGENCY'/);
  assert.match(routes, /writeAudit/);
});

test('RH : création utilise seulement un type actif et préserve les snapshots historiques', () => {
  assert.match(contractForm, /Aucun type de contrat actif n’est disponible/);
  assert.match(contractForm, /types\.data\?\.map/);
  assert.match(routes, /concession_id=\? AND is_active=TRUE FOR UPDATE/);
  assert.match(routes, /type_code_snapshot,type_name_snapshot/);
  assert.match(migration, /type_code_snapshot VARCHAR\(50\) NOT NULL/);
  assert.match(migration, /type_name_snapshot VARCHAR\(120\) NOT NULL/);
  assert.match(migration, /ON DELETE RESTRICT/);
  assert.doesNotMatch(routes, /DELETE FROM employee_contract_types/);
});
