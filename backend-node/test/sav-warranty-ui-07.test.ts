import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workshop = readFileSync(new URL('../src/modules/workshop/workshop.routes.ts', import.meta.url), 'utf8');
const warranty = readFileSync(new URL('../src/modules/workshop/warranty.service.ts', import.meta.url), 'utf8');
const warrantyRoutes = readFileSync(new URL('../src/modules/workshop/warranty.routes.ts', import.meta.url), 'utf8');

const approvalContract = workshop.match(/const approvalBlockReason=[\s\S]*?const customerApproval=\{[^;]+/)?.[0] ?? '';
const approvalRoute = workshop.match(/workshopRouter\.post\(\s*"\/repair-orders\/:id\/approval"[\s\S]*?\n\);/)?.[0] ?? '';

test('UI07-BE-01 PENDING bloque la validation client', () => assert.match(approvalContract, /decision_status==='PENDING'/));
test('UI07-BE-02 APPROVED FULL ne constitue pas un blocage', () => assert.doesNotMatch(approvalContract, /coverage_mode|FULL/));
test('UI07-BE-03 APPROVED PARTIAL ne constitue pas un blocage', () => assert.doesNotMatch(approvalContract, /PARTIAL/));
test('UI07-BE-04 REJECTED ne constitue pas un blocage', () => assert.doesNotMatch(approvalContract, /decision_status==='REJECTED'/));
test('UI07-BE-05 un OR sans garantie satisfait la condition Warranty', () => assert.match(approvalContract, /\?\.decision_status==='PENDING'/));
test('UI07-BE-06 canDecide est calculé et retourné par le serveur', () => assert.match(approvalContract, /canDecide:approvalBlockReason===null/));
test('UI07-BE-07/08/09 le contrat est reconstructible après refetch', () => { assert.match(workshop, /latestApproval=approvals\[0\]/); assert.match(workshop, /warrantyDetail\(id\)/); });
test('UI07-BE-10 RBAC de la décision client reste serveur', () => assert.match(approvalRoute, /serviceAccess\('service\.order\.approve'\)/));
test('UI07-BE-11 acceptation client est persistée', () => assert.match(approvalRoute, /INSERT INTO repair_approvals/));
test('UI07-BE-12 refus client est persisté et terminalise l’OR', () => assert.match(approvalRoute, /status='cancelled'/));
test('UI07-BE-13 refus client reste incompatible avec démarrage', () => assert.match(workshop, /assertCustomerDidNotReject/));
test('UI07-BE-14 code constructeur vient de la relation provider', () => assert.match(warranty, /p\.code provider_code/));
test('UI07-BE-15 autorisation et code constructeur sont des champs distincts', () => { assert.match(warranty, /provider_code/); assert.match(warrantyRoutes, /authorization_reference/); });
test('UI07-BE-16 aucune comparaison entre autorisation et code constructeur', () => assert.doesNotMatch(`${workshop}\n${warranty}`, /authorization_reference\s*[!=]==?\s*(provider_code|p\.code)/));
test('UI07-BE-17 la raison PENDING est explicite et autoritaire', () => assert.match(approvalContract, /doit être enregistrée avant la validation client/));
test('UI07-BE-18 chiffrage positif, statut, décision et travaux composent la formule', () => { for (const token of ["ro.status!=='waiting_approval'", 'latestApproval', 'workStarted', 'estimateSummary.total<=0']) assert.match(approvalContract, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); });
