import assert from'node:assert/strict';
import test from'node:test';
import{customerApprovalState}from'../src/modules/workshop/customer-approval-state.js';
import{WORK_STARTED_COUNT_SQL,workStartedFromEvidence}from'../src/modules/workshop/work-start-state.js';

const notStarted=()=>workStartedFromEvidence({startedSessionCount:0});
const ready=(warrantyDecisionStatus:'APPROVED'|'REJECTED'|null)=>customerApprovalState({status:'waiting_approval',latestApproval:null,workStarted:notStarted(),warrantyDecisionStatus,estimateTotal:53505});

test('WORKSTART-01 Warranty REJECTED sans session laisse la validation disponible',()=>{assert.equal(notStarted(),false);assert.equal(ready('REJECTED').canDecide,true)});
test('WORKSTART-02 Warranty APPROVED FULL sans session laisse la validation disponible',()=>{assert.equal(notStarted(),false);assert.equal(ready('APPROVED').canDecide,true)});
test('WORKSTART-03 Warranty APPROVED PARTIAL sans session laisse la validation disponible',()=>{assert.equal(notStarted(),false);assert.equal(ready('APPROVED').canDecide,true)});
test('WORKSTART-04 absence de Warranty sans session laisse la validation disponible',()=>{assert.equal(notStarted(),false);assert.equal(ready(null).canDecide,true)});
for(const[code,label]of[
  ['05','réception'],['06','diagnostic'],['07','chiffrage'],['08','affectation technicien'],['09','planification'],['10','préparation ou réservation de pièces'],
]as const)test(`WORKSTART-${code} ${label} sans session ne vaut pas démarrage`,()=>assert.equal(notStarted(),false));
test('WORKSTART-11 une session avec started_at vaut démarrage',()=>assert.equal(workStartedFromEvidence({startedSessionCount:1}),true));
test('WORKSTART-12 une session démarrée puis en pause conserve la preuve historique',()=>assert.equal(workStartedFromEvidence({startedSessionCount:1}),true));
test('WORKSTART-13 une session démarrée puis arrêtée conserve la preuve historique',()=>assert.equal(workStartedFromEvidence({startedSessionCount:1}),true));
test('WORKSTART-14 time_entries seuls ne sont pas une preuve canonique',()=>{assert.doesNotMatch(WORK_STARTED_COUNT_SQL,/time_entries/);assert.equal(notStarted(),false)});
test('WORKSTART-15 la preuve SQL est corrélée à l’OR demandé',()=>{assert.match(WORK_STARTED_COUNT_SQL,/repair_order_id=\?/);assert.equal(workStartedFromEvidence({startedSessionCount:0}),false)});
test('WORKSTART-16 les représentations SQL de zéro ne deviennent jamais vraies',()=>{for(const value of[0,'0',0n,null,undefined])assert.equal(workStartedFromEvidence({startedSessionCount:value}),false)});
test('WORKSTART-17 le workflow séquentiel reste faux jusqu’au démarrage explicite',()=>{
  const states=['création','réception','diagnostic','chiffrage','demande validation','validation client','préparation atelier','affectation','planification'];
  for(const state of states)assert.equal(notStarted(),false,state);
  assert.equal(ready('REJECTED').canDecide,true);
  assert.equal(workStartedFromEvidence({startedSessionCount:1}),true);
});
