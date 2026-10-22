import assert from'node:assert/strict';
import test from'node:test';
import{plannedDriveStartState}from'../src/modules/showroom/showroomPolicy.ts';

test('l’action est masquée sans permission ou hors statut planned',()=>{
  assert.equal(plannedDriveStartState('planned',false),'hidden');
  assert.equal(plannedDriveStartState('in_progress',true),'hidden');
  assert.equal(plannedDriveStartState('cancelled',true),'hidden');
});

test('l’action est disponible pour tout essai planifié, indépendamment de son horaire',()=>{
  assert.equal(plannedDriveStartState('planned',true),'ready');
});
