import assert from'node:assert/strict';
import test from'node:test';
import{isRepairOrderInWorkshop,REPAIR_ORDER_IN_WORKSHOP_STATUSES}from'../src/modules/workshop/repair-order-status.js';

test('SAV-OR-UX-05 compte uniquement les phases opérationnelles atelier',()=>{
  const statuses=['planned','received','diagnosis','waiting_approval','in_progress','quality_control','ready','invoiced','delivered','closed','cancelled'];
  assert.deepEqual(REPAIR_ORDER_IN_WORKSHOP_STATUSES,['in_progress','quality_control']);
  assert.deepEqual(statuses.filter(isRepairOrderInWorkshop),['in_progress','quality_control']);
  assert.equal(statuses.filter(isRepairOrderInWorkshop).length,2);
});

test('SAV-OR-UX-05 exclut explicitement tous les états terminaux du compteur',()=>{
  for(const status of ['ready','invoiced','delivered','closed','cancelled'])assert.equal(isRepairOrderInWorkshop(status),false,status);
});
