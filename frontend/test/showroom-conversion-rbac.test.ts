import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {canConvertShowroomVisitToLead} from '../src/modules/showroom/showroomPolicy.js';

const page=readFileSync(new URL('../src/modules/showroom/ShowroomPage.tsx',import.meta.url),'utf8');
const backend=readFileSync(new URL('../../backend-node/src/modules/showroom/showroom.routes.ts',import.meta.url),'utf8');
const convertible={status:'Terminé',leadId:null};

test('RBAC-CONVERT-01 status NON / visitor NON masque la conversion',()=>{
  assert.equal(canConvertShowroomVisitToLead(convertible,false),false);
});

test('RBAC-CONVERT-02 status OUI / visitor NON masque la conversion',()=>{
  const canUpdateStatus=true,canUpdateVisitor=false;
  assert.equal(canUpdateStatus,true);
  assert.equal(canConvertShowroomVisitToLead(convertible,canUpdateVisitor),false);
});

test('RBAC-CONVERT-03 status NON / visitor OUI autorise une visite convertible',()=>{
  const canUpdateStatus=false,canUpdateVisitor=true;
  assert.equal(canUpdateStatus,false);
  assert.equal(canConvertShowroomVisitToLead(convertible,canUpdateVisitor),true);
});

test('RBAC-CONVERT-04 status OUI / visitor OUI autorise une visite convertible',()=>{
  assert.equal(canConvertShowroomVisitToLead(convertible,true),true);
});

test('RBAC-CONVERT-05 conserve les conditions métier de conversion',()=>{
  assert.equal(canConvertShowroomVisitToLead({status:'En Entretien',leadId:null},true),false);
  assert.equal(canConvertShowroomVisitToLead({status:'Terminé',leadId:'42'},true),false);
});

test('RBAC-CONVERT-06 conversion et clôture conservent leurs permissions distinctes',()=>{
  assert.match(page,/canConvertToLead=can\('showroom\.visitor\.update'\)/);
  assert.match(page,/canConvertShowroomVisitToLead\(visit,canConvertToLead\)/);
  assert.match(page,/canComplete=can\('showroom\.status\.update'\)/);
  assert.match(page,/canComplete&&visit\.origin==='showroom'/);
  assert.match(backend,/post\('\/showroom\/:id\/convert-to-lead',requirePermission\('showroom\.visitor\.update'\)/);
});
