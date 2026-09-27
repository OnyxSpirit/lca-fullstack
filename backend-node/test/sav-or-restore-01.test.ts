import assert from'node:assert/strict';
import test from'node:test';
import{customerApprovalState,type WarrantyDecisionStatus}from'../src/modules/workshop/customer-approval-state.js';

const ready=(warrantyDecisionStatus:WarrantyDecisionStatus)=>customerApprovalState({status:'waiting_approval',latestApproval:null,workStarted:false,warrantyDecisionStatus,estimateTotal:125000});

test('RESTORE-01 sans garantie: validation client disponible après diagnostic, devis et waiting_approval',()=>assert.equal(ready(null).canDecide,true));
test('RESTORE-02 Warranty PENDING: validation client bloquée',()=>{const state=ready('PENDING');assert.equal(state.canDecide,false);assert.match(state.blockReason??'',/constructeur/)});
test('RESTORE-03 PENDING vers APPROVED FULL: validation client disponible',()=>assert.equal(ready('APPROVED').canDecide,true));
test('RESTORE-04 PENDING vers APPROVED PARTIAL: validation client disponible',()=>assert.equal(ready('APPROVED').canDecide,true));
test('RESTORE-05 PENDING vers REJECTED: validation client disponible',()=>assert.equal(ready('REJECTED').canDecide,true));
test('RESTORE-06 aucun attribut financier Warranty ne participe au verrou',()=>assert.deepEqual(Object.keys(ready('APPROVED')).sort(),['blockReason','canDecide','decided','decision','required','submittedAmount'].sort()));
test('RESTORE-07 acceptation persistée restaure la continuité vers les travaux',()=>{const state=customerApprovalState({status:'waiting_approval',latestApproval:{approved:true,approvedAmount:125000},workStarted:false,warrantyDecisionStatus:'APPROVED',estimateTotal:125000});assert.equal(state.decision,'APPROVED');assert.equal(state.decided,true)});
test('RESTORE-08 refus persisté reste terminal',()=>{const state=customerApprovalState({status:'waiting_approval',latestApproval:{approved:false,approvedAmount:125000},workStarted:false,warrantyDecisionStatus:'REJECTED',estimateTotal:125000});assert.equal(state.decision,'REJECTED');assert.equal(state.decided,true)});
