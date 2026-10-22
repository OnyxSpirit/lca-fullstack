import assert from'node:assert/strict';
import test from'node:test';
import{plannedDriveStartState}from'../src/modules/showroom/showroomPolicy.ts';

const now=new Date('2026-10-23T09:00:00.000Z');

test('l’action est masquée sans permission ou hors statut planned',()=>{
  assert.equal(plannedDriveStartState('planned',false,'2026-10-23 09:00:00',now),'hidden');
  assert.equal(plannedDriveStartState('in_progress',true,'2026-10-23 09:00:00',now),'hidden');
  assert.equal(plannedDriveStartState('cancelled',true,'2026-10-23 09:00:00',now),'hidden');
});

test('l’action est désactivée avant le créneau et disponible à partir de la tolérance backend',()=>{
  assert.equal(plannedDriveStartState('planned',true,'2026-10-23 09:01:01',now),'too_early');
  assert.equal(plannedDriveStartState('planned',true,'2026-10-23 09:01:00',now),'ready');
  assert.equal(plannedDriveStartState('planned',true,'2026-10-23 08:59:00',now),'ready');
});

test('un horaire invalide ne rend jamais le démarrage actif',()=>{
  assert.equal(plannedDriveStartState('planned',true,'date-invalide',now),'too_early');
});
