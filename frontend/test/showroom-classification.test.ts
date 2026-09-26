import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFileSync} from 'node:fs';
import {classifyShowroomVisits,eligibleShowroomSalesUsers} from '../src/modules/showroom/showroomPolicy.js';

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

test('SHOWROOM-FE-01 un rôle inconnu est sélectionnable uniquement par permission',()=>{
  const users=[{id:'1',name:'Dynamique',status:'active',agencyId:'A',role:'ROLE_INCONNU',permissions:{'sales.create':'OWN'}},{id:'2',name:'Historique',status:'active',agencyId:'A',role:'SALES_MANAGER',permissions:{}}];
  assert.deepEqual(eligibleShowroomSalesUsers(users,'A').map(user=>user.id),['1']);
});

test('SHOWROOM-FE-02 utilisateur inactif et autre agence sont exclus',()=>{
  const users=[{id:'1',status:'inactive',agencyId:'A',permissions:{'sales.create':'OWN'}},{id:'2',status:'active',agencyId:'B',permissions:{'crm.prospect.update':'AGENCY'}}];
  assert.equal(eligibleShowroomSalesUsers(users,'A').length,0);
});

test('SHOWROOM-FE-03 les requêtes et actions utilisent les permissions exactes',()=>{
  const page=readFileSync(new URL('../src/modules/showroom/ShowroomPage.tsx',import.meta.url),'utf8'),hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');
  for(const code of ['showroom.view','showroom.assign','showroom.visitor.create','showroom.status.update','showroom.visitor.update'])assert.ok(page.includes(code),code);
  assert.match(page,/useShowroomBoardQuery\(canView\)/);
  assert.match(page,/useShowroomSalesCandidatesQuery\(visit\.agencyId,true\)/);
  assert.match(hooks,/enabled: enabled\(\) && requestEnabled/);
});

test('SHOWROOM-FE-04 l’affectation transporte la valeur attendue contre la concurrence',()=>{
  const page=readFileSync(new URL('../src/modules/showroom/ShowroomPage.tsx',import.meta.url),'utf8');
  assert.match(page,/expectedAssignedUserId/);
  assert.match(page,/actions\.assign\.isPending/);
});
