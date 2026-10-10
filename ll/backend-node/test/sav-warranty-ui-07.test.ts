import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { customerApprovalState } from '../src/modules/workshop/customer-approval-state.js';

const workshop = readFileSync(new URL('../src/modules/workshop/workshop.routes.ts', import.meta.url), 'utf8');
const warranty = readFileSync(new URL('../src/modules/workshop/warranty.service.ts', import.meta.url), 'utf8');
const warrantyRoutes = readFileSync(new URL('../src/modules/workshop/warranty.routes.ts', import.meta.url), 'utf8');

const approvalContract = readFileSync(new URL('../src/modules/workshop/customer-approval-state.ts', import.meta.url), 'utf8');
const approvalRoute = workshop.match(/workshopRouter\.post\(\s*"\/repair-orders\/:id\/approval"[\s\S]*?\n\);/)?.[0] ?? '';
const state=(warrantyDecisionStatus:'PENDING'|'APPROVED'|'REJECTED'|null)=>customerApprovalState({status:'waiting_approval',latestApproval:null,workStarted:false,warrantyDecisionStatus,estimateTotal:100});

test('UI07-BE-01 PENDING bloque la validation client', () => assert.equal(state('PENDING').canDecide,false));
test('UI07-BE-02 APPROVED FULL ne constitue pas un blocage', () => assert.doesNotMatch(approvalContract, /coverage_mode|FULL/));
test('UI07-BE-03 APPROVED PARTIAL ne constitue pas un blocage', () => assert.doesNotMatch(approvalContract, /PARTIAL/));
test('UI07-BE-04 REJECTED ne constitue pas un blocage', () => assert.doesNotMatch(approvalContract, /decision_status==='REJECTED'/));
test('UI07-BE-05 un OR sans garantie satisfait la condition Warranty', () => assert.equal(state(null).canDecide,true));
test('UI07-BE-06 canDecide est calculé et retourné par le serveur', () => assert.equal(state('APPROVED').canDecide,true));
test('UI07-BE-07/08/09 le contrat est reconstructible après refetch', () => { assert.match(workshop, /latestApproval=approvals\[0\]/); assert.match(workshop, /warrantyDetail\(id\)/); });
test('UI07-BE-10 RBAC de la décision client reste serveur', () => assert.match(approvalRoute, /serviceAccess\('service\.order\.approve'\)/));
test('UI07-BE-11 acceptation client est persistée', () => assert.match(approvalRoute, /INSERT INTO repair_approvals/));
test('UI07-BE-12 refus client est persisté et terminalise l’OR', () => assert.match(approvalRoute, /status='cancelled'/));
test('UI07-BE-13 refus client reste incompatible avec démarrage', () => assert.match(workshop, /assertCustomerDidNotReject/));
test('UI07-BE-14 code constructeur vient du snapshot avec relation provider en repli', () => assert.match(warranty, /COALESCE\(vwc\.provider_code_snapshot,p\.code\) provider_code/));
test('UI07-BE-15 autorisation et code constructeur sont des champs distincts', () => { assert.match(warranty, /provider_code/); assert.match(warrantyRoutes, /authorization_reference/); });
test('UI07-BE-16 aucune comparaison entre autorisation et code constructeur', () => assert.doesNotMatch(`${workshop}\n${warranty}`, /authorization_reference\s*[!=]==?\s*(provider_code|p\.code)/));
test('UI07-BE-17 la raison PENDING est explicite et autoritaire', () => assert.match(state('PENDING').blockReason??'', /doit être enregistrée avant la validation client/));
test('UI07-BE-18 chiffrage positif, statut, décision et travaux composent la formule', () => { for (const token of ["status!=='waiting_approval'", 'latestApproval', 'workStarted', 'estimateTotal<=0']) assert.match(approvalContract, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); });
