import assert from'node:assert/strict';
import test from'node:test';
import{customerApprovalState}from'../src/modules/workshop/customer-approval-state.js';
import{workStartedFromEvidence}from'../src/modules/workshop/work-start-state.js';
import{readFileSync}from'node:fs';

const approval=(warrantyDecisionStatus:'PENDING'|'APPROVED'|'REJECTED'|null,startedSessionCount=0)=>customerApprovalState({status:'waiting_approval',latestApproval:null,workStarted:workStartedFromEvidence({startedSessionCount}),warrantyDecisionStatus,estimateTotal:100});

test('WORKFLOW-01 sans garantie atteint Validation client sans faux démarrage',()=>{assert.equal(approval(null).canDecide,true);assert.equal(workStartedFromEvidence({startedSessionCount:0}),false)});
test('WORKFLOW-02 Warranty PENDING bloque puis APPROVED et REJECTED libèrent',()=>{assert.equal(approval('PENDING').canDecide,false);assert.equal(approval('APPROVED').canDecide,true);assert.equal(approval('REJECTED').canDecide,true)});
test('WORKFLOW-03 réception, diagnostic, chiffrage, acceptation, affectation, planification et réservation sans session restent non commencés',()=>{
  for(const _step of['reception','diagnosis','estimate','approval','assignment','schedule','reservation'])assert.equal(workStartedFromEvidence({startedSessionCount:0}),false);
});
test('WORKFLOW-04 seule une session persistée démarrée rend le fait irréversible après pause ou arrêt',()=>{assert.equal(workStartedFromEvidence({startedSessionCount:1}),true);assert.equal(workStartedFromEvidence({startedSessionCount:1}),true)});
test('WORKFLOW-05 une entrée de temps isolée ne constitue pas une preuve autonome',()=>assert.equal(workStartedFromEvidence({startedSessionCount:0}),false));
test('WORKFLOW-06 deux OR reconstruisent leur preuve indépendamment',()=>assert.deepEqual([workStartedFromEvidence({startedSessionCount:1}),workStartedFromEvidence({startedSessionCount:0})],[true,false]));
test('WORKFLOW-07 une API directe ne peut pas simuler le démarrage par le seul statut intervention',()=>{const routes=readFileSync(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');assert.match(routes,/if\(status==='in_progress'\)throw new HttpError\(409,'Utilisez le démarrage de session/);assert.match(routes,/INSERT INTO work_sessions\(repair_order_id,technician_id,intervention_id,bay_id,started_at,status,created_by\)/)});
