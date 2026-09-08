import assert from 'node:assert/strict';
import {test} from 'node:test';
import {classifyShowroomVisits} from '../src/modules/showroom/showroomPolicy.js';

const waitingVisit={id:'1',status:'En Attente',assignedUserId:''};
const assignedVisit={id:'2',status:'Affecté',assignedUserId:'20'};

test('REC-12 classe uniquement le visiteur non affecté dans En attente',()=>{
  const board=classifyShowroomVisits([waitingVisit]);
  assert.deepEqual(board.waiting.map(visit=>visit.id),['1']);
  assert.equal(board.assigned.length,0);
});

test('REC-12 classe un visiteur affecté uniquement dans Affectés',()=>{
  const board=classifyShowroomVisits([assignedVisit]);
  assert.equal(board.waiting.length,0);
  assert.deepEqual(board.assigned.map(visit=>visit.id),['2']);
});

test('REC-12 reflète immédiatement la transition waiting vers assigned sans doublon',()=>{
  const before=classifyShowroomVisits([waitingVisit]);
  const after=classifyShowroomVisits([{...waitingVisit,status:'Affecté',assignedUserId:'20'}]);
  assert.equal(before.waiting.length,1);assert.equal(before.assigned.length,0);
  assert.equal(after.waiting.length,0);assert.equal(after.assigned.length,1);
  assert.equal(new Set([...after.waiting,...after.assigned,...after.progress,...after.completed].map(visit=>visit.id)).size,1);
});

test('REC-12 conserve le classement après rechargement et exclut une annulation',()=>{
  const reloaded=JSON.parse(JSON.stringify([assignedVisit])) as Array<typeof assignedVisit>;
  assert.deepEqual(classifyShowroomVisits(reloaded).assigned.map(visit=>visit.id),['2']);
  const cancelled=classifyShowroomVisits([{id:'3',status:'Annulé',assignedUserId:''}]);
  assert.equal(cancelled.waiting.length,0);assert.equal(cancelled.assigned.length,0);assert.equal(cancelled.progress.length,0);assert.equal(cancelled.completed.length,0);
});
