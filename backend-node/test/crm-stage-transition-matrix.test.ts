import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_STAGE_TRANSITIONS,isCrmStageTransitionAllowed,type CrmStage} from '../src/modules/crm/crm.routes.js';

const stages=Object.keys(CRM_STAGE_TRANSITIONS) as CrmStage[];
const expected=new Set([
  'new>contacted','new>lost',
  'contacted>qualified','contacted>lost',
  'qualified>lost','appointment>lost','test_drive>lost',
  'offer>negotiation','offer>lost','negotiation>lost',
]);

test('CRM-01 couvre explicitement les 81 couples de la matrice 9 x 9',()=>{
  assert.equal(stages.length,9);
  let checked=0;
  for(const source of stages)for(const target of stages){
    assert.equal(isCrmStageTransitionAllowed(source,target),expected.has(`${source}>${target}`),`${source} -> ${target}`);
    checked++;
  }
  assert.equal(checked,81);
});

test('CRM-01 les transitions identiques et les sorties des états terminaux sont interdites',()=>{
  for(const stage of stages)assert.equal(isCrmStageTransitionAllowed(stage,stage),false,stage);
  for(const terminal of ['won','lost'] as const)for(const target of stages)assert.equal(isCrmStageTransitionAllowed(terminal,target),false,`${terminal} -> ${target}`);
});

test('CRM-01 le refus précède transaction, activité, notification et temps réel',()=>{
  const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
  const route=source.slice(source.indexOf("crmRouter.patch('/leads/:id/stage'"),source.indexOf("crmRouter.post('/leads/:id/appointments'"));
  const guard=route.indexOf('isCrmStageTransitionAllowed');
  assert.ok(guard>0);
  for(const effect of ['transaction(async','publishCrmLeadUpdated','notifyCrm'])assert.ok(guard<route.indexOf(effect),effect);
});
