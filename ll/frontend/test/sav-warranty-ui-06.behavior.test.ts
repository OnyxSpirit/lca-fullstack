import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const card = readFileSync(new URL('../src/modules/service/WarrantyCard.tsx', import.meta.url), 'utf8');
const detail = readFileSync(new URL('../src/modules/service/RepairOrderDetailPage.tsx', import.meta.url), 'utf8');
const hooks = readFileSync(new URL('../src/api/erpHooks.ts', import.meta.url), 'utf8');
const modal = readFileSync(new URL('../src/modules/service/NewRepairOrderModal.tsx', import.meta.url), 'utf8');

test('UI06-FE-01 PENDING expose l’approbation', () => assert.match(card, /decisionStatus === 'PENDING'[\s\S]*Approuver la prise en charge/));
test('UI06-FE-02 PENDING expose le refus', () => assert.match(card, /decisionStatus === 'PENDING'[\s\S]*Refuser la prise en charge/));
test('UI06-FE-03 les choix TOTAL et PARTIEL sont libellés en français', () => { assert.match(card, /value="FULL">Prise en charge totale/); assert.match(card, /value="PARTIAL">Prise en charge partielle/); });
test('UI06-FE-04 approbation exige constructeur et autorisation', () => { assert.match(card, /!warranty\.providerId/); assert.match(card, /!authorization\.trim\(\)/); });
test('UI06-FE-05 les motifs de désactivation sont visibles', () => { assert.match(card, /approvalReason &&/); assert.match(card, /rejectionReason &&/); });
test('UI06-FE-06 APPROVED transmet le mode, le constructeur et la référence', () => assert.match(card, /providerId: warranty\.providerId, mode, authorizationReference: authorization\.trim\(\)/));
test('UI06-FE-07 REJECTED demande confirmation et transmet le motif', () => { assert.match(card, /window\.confirm/); assert.match(card, /decision === 'APPROVED'[\s\S]*: \{ reason: comment\.trim\(\) \}/); });
test('UI06-FE-08 APPROVED est reconstruit depuis la version serveur', () => { assert.match(card, /warranty\.decisionStatus !== 'PENDING'/); assert.match(card, /\[ro\.id, warranty\?\.version\]/); });
test('UI06-FE-09 REJECTED reste rendu après refetch', () => assert.match(card, /warrantyDecisionLabel\[warranty\.decisionStatus\]/));
test('UI06-FE-10 PENDING reste traitable après refetch', () => assert.match(card, /useEffect\(\(\) => \{[\s\S]*setAuthorization/));
test('UI06-FE-11 absence de permission expliquée sans actions', () => { assert.match(card, /mayDecide \?/); assert.match(card, /doit être traitée par un utilisateur autorisé/); });
test('UI06-FE-12 un montant non alloué est À déterminer', () => assert.match(card, /allocationsKnown \? formatCurrency\(value\) : 'À déterminer'/));
test('UI06-FE-13 une allocation réelle zéro passe par formatCurrency', () => assert.match(card, /allocationsKnown = warranty\.allocations\.length > 0/));
test('UI06-FE-14 la création OR ne réintroduit aucune checkbox garantie', () => { assert.match(modal, /useVehicleWarrantyEligibilityQuery/); assert.doesNotMatch(modal, /warrantyIntent|type="checkbox"[^>]*garantie/i); });
test('UI06-FE-15 la mutation refetch le détail OR', () => assert.match(hooks, /\['repair-orders',v\.repairOrderId\]/));
test('UI06-FE-16 PENDING seul verrouille la réception', () => { assert.match(detail, /warrantyDecisionPending=ro\.warranty\?\.decisionStatus==='PENDING'/); assert.match(detail, /next==='RECEPTIONNE'&&warrantyDecisionPending/); });

