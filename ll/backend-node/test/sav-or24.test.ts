import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const routes=readFileSync(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');
const approvalRoute=routes.slice(routes.indexOf('"/repair-orders/:id/approval"'),routes.indexOf('"/service-appointments"'));
const statusRoute=routes.slice(routes.indexOf('"/repair-orders/:id/status"'),routes.indexOf('"/repair-orders/:id/inspection"'));
const sessionRoute=routes.slice(routes.indexOf('"/repair-orders/:id/sessions/start"'),routes.indexOf("'/repair-orders/:id/sessions/:sessionId/pause'"));

test('OR24-01 acceptation conserve le workflow normal',()=>assert.match(statusRoute,/if \(!a\?\.approved\)[\s\S]*Validation client obligatoire/));
test('OR24-02 refus client est persisté puis terminalisé distinctement',()=>{assert.match(approvalRoute,/INSERT INTO repair_approvals/);assert.match(approvalRoute,/status='cancelled'/);assert.match(approvalRoute,/Travaux refusés par le client/)});
test('OR24-03 refus est sérialisé avant toute activité réelle',()=>{assert.match(approvalRoute,/SELECT status,agency_id FROM repair_orders WHERE id=\? FOR UPDATE/);assert.match(approvalRoute,/assertWorkNotStarted\(c,id\)/)});
test('OR24-04 démarrage OR et session relisent la décision persistée sous verrou',()=>{assert.match(statusRoute,/assertCustomerDidNotReject\(c,id\)/);assert.match(sessionRoute,/assertCustomerDidNotReject\(c,id\)/);assert.match(routes,/SELECT approved FROM repair_approvals[\s\S]*FOR UPDATE/)});
test('OR24-05 permissions élevées ne contournent pas la règle métier',()=>{const helper=routes.slice(routes.indexOf('async function assertCustomerDidNotReject'),routes.indexOf('const workshopScope'));assert.doesNotMatch(helper,/GLOBAL|isSuperAdmin|rbac/)});
test('OR24-06 affectation et planification seules ne constituent pas un commencement',()=>{const helper=routes.slice(routes.indexOf('async function assertWorkNotStarted'),routes.indexOf('async function assertCustomerDidNotReject'));assert.doesNotMatch(helper,/schedules|technician|interventions/)});
test('OR24-07 commencement effectif interdit le refus rétroactif',()=>assert.match(approvalRoute,/assertWorkNotStarted\(c,id\)/));
test('OR24-08 refus ne fabrique ni facture ni consommation',()=>{assert.doesNotMatch(approvalRoute,/INSERT INTO invoices|INSERT INTO repair_order_items|movement_type.*consumption/)});
test('OR24-09 réservations et planning préparatoire sont nettoyés sans perdre la décision',()=>{assert.match(approvalRoute,/cleanupAbandonment/);assert.match(approvalRoute,/schedule-cancelled/);assert.match(approvalRoute,/parts:stock-changed/)});
test('OR24-10 garantie partielle ne peut contourner le refus client',()=>{assert.match(statusRoute,/assertCustomerDidNotReject\(c,id\)/);assert.match(statusRoute,/assertWarrantyMayStart\(c,id\)/)});
test('OR24-11 refus et démarrage verrouillent le même OR',()=>{assert.match(approvalRoute,/repair_orders WHERE id=\? FOR UPDATE/);assert.match(sessionRoute,/repair_orders WHERE id=\? FOR UPDATE/)});
test('OR24-12 deux OR restent isolés par repairOrderId',()=>assert.match(routes,/repair_approvals WHERE repair_order_id=\?/));
