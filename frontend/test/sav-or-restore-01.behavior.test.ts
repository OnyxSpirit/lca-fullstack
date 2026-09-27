import assert from'node:assert/strict';
import test from'node:test';
import{canRenderCustomerApproval}from'../src/modules/service/repairOrderActionState';

test('RESTORE-FE-01 contrat serveur ouvert + service.order.approve: formulaire disponible',()=>assert.equal(canRenderCustomerApproval(true,true),true));
test('RESTORE-FE-02 contrat serveur ouvert sans service.order.approve: formulaire indisponible',()=>assert.equal(canRenderCustomerApproval(true,false),false));
test('RESTORE-FE-03 permission présente mais verrou métier: formulaire indisponible',()=>assert.equal(canRenderCustomerApproval(false,true),false));
test('RESTORE-FE-04 permission et verrou absents: formulaire indisponible',()=>assert.equal(canRenderCustomerApproval(false,false),false));
