import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const card = readFileSync(new URL('../src/modules/service/WarrantyCard.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/modules/service/RepairOrderDetailPage.tsx', import.meta.url), 'utf8');
const hooks = readFileSync(new URL('../src/api/erpHooks.ts', import.meta.url), 'utf8');
const types = readFileSync(new URL('../src/types/index.ts', import.meta.url), 'utf8');
const approvalAssignment = detail.match(/approvalActive=ro\.customerApproval\.canDecide/)?.[0] ?? '';

test('UI07-FE-01 PENDING affiche la raison serveur', () => assert.match(detail, /ro\.customerApproval\.blockReason/));
test('UI07-FE-02/03/04 APPROVED FULL, PARTIAL et REJECTED ne sont pas recalculés dans React', () => { assert.match(detail, /approvalActive=ro\.customerApproval\.canDecide/); assert.doesNotMatch(detail, /approvalActive=.*(FULL|PARTIAL|REJECTED)/); });
test('UI07-FE-05 OR sans garantie ne reçoit aucune condition additionnelle', () => assert.doesNotMatch(approvalAssignment, /ro\.warranty/));
test('UI07-FE-06 canDecide vient du serveur', () => assert.match(detail, /approvalActive=ro\.customerApproval\.canDecide/));
test('UI07-FE-07/08/09 refetch mappe canDecide et blockReason', () => { assert.match(hooks, /canDecide:Boolean\(r\.customerApproval\?\.canDecide\)/); assert.match(hooks, /blockReason:r\.customerApproval\?\.blockReason/); });
test('UI07-FE-10 permission absente reçoit une explication distincte', () => { assert.match(detail, /canApproveCustomer=can\('service\.order\.approve'\)/); assert.match(detail, /permission requise/); });
test('UI07-FE-11 acceptation utilise toujours la mutation persistée', () => assert.match(detail, /actions\.approval/));
test('UI07-FE-12 refus est déterminé par le bouton submit', () => assert.match(detail, /submitter\?\.getAttribute\('value'\)==='approved'/));
test('UI07-FE-13 démarrage exige toujours APPROVED', () => assert.match(detail, /next==='EN_COURS'&&ro\.customerApproval\.decision!=='APPROVED'/));
test('UI07-FE-14 code constructeur est en lecture seule', () => assert.match(card, /Code constructeur<input[^>]*readOnly[^>]*providerCode/));
test('UI07-FE-15 N° autorisation est un champ distinct saisissable', () => assert.match(card, /N° d’autorisation de prise en charge<input[^>]*value=\{authorization\}[^>]*onChange/));
test('UI07-FE-16 aucune comparaison code/autorisation', () => assert.doesNotMatch(card, /authorization\s*[!=]==?\s*warranty\.providerCode/));
test('UI07-FE-17 UI-06 conserve décisions et double soumission', () => { assert.match(card, /Approuver la prise en charge/); assert.match(card, /Refuser la prise en charge/); assert.match(card, /disabled=\{Boolean\(approvalReason\) \|\| deciding\}/); });
test('UI07-FE-18 SAV-OR-25 conserve le contrat typé', () => { assert.match(types, /customerApproval:\{required:boolean;decided:boolean/); assert.match(types, /blockReason:string\|null/); });
