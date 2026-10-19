import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {commercialProgressForStage,CRM_COMMERCIAL_PROGRESS} from '../src/modules/crm/crm-commercial-progress.js';

test('B346-BE-01 applique le barème aux huit étapes commerciales gagnantes',()=>{
  assert.deepEqual(CRM_COMMERCIAL_PROGRESS,{new:0,contacted:10,qualified:25,appointment:40,test_drive:55,offer:70,negotiation:85,won:100});
  for(const[stage,value]of Object.entries(CRM_COMMERCIAL_PROGRESS))assert.equal(commercialProgressForStage(stage).commercialProgress,value,stage);
});

test('B346-BE-02 distingue vente gagnée, vente perdue et statut inconnu',()=>{
  assert.deepEqual(commercialProgressForStage('won'),{commercialProgress:100,commercialProgressState:'WON'});
  assert.deepEqual(commercialProgressForStage('lost'),{commercialProgress:null,commercialProgressState:'LOST'});
  assert.deepEqual(commercialProgressForStage('future_stage'),{commercialProgress:null,commercialProgressState:'UNAVAILABLE'});
});

test('B346-BE-03 les mutations du score et de l’étape restent indépendantes',()=>{
  const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
  const update=source.slice(source.indexOf("crmRouter.patch('/leads/:id'"),source.indexOf("crmRouter.patch('/leads/:id/stage'"));
  const stage=source.slice(source.indexOf("crmRouter.patch('/leads/:id/stage'"),source.indexOf("crmRouter.post('/leads/:id/appointments'"));
  assert.match(update,/probability:'probability'/);
  assert.doesNotMatch(update,/stage:'stage'|SET stage/);
  assert.match(stage,/UPDATE opportunities SET stage=/);
  assert.doesNotMatch(stage,/probability/);
});

test('B346-BE-04 les contrats sont additifs et Client 360 réutilise la règle centrale',()=>{
  const crm=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
  const customers=readFileSync(new URL('../src/modules/customers/customer.routes.ts',import.meta.url),'utf8');
  assert.match(crm,/probability:row\.probability,\.\.\.commercialProgressForStage\(row\.stage\)/);
  assert.match(customers,/probability:Number\(r\.probability\?\?0\),\.\.\.commercialProgressForStage\(r\.stage\)/);
  assert.doesNotMatch(crm,/ALTER TABLE|commercial_progress/);
});
