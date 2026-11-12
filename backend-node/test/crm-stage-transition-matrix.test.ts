import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CRM_STAGE_TRANSITIONS,isCrmStageTransitionAllowed,type CrmStage} from '../src/modules/crm/crm.routes.js';

const stages=Object.keys(CRM_STAGE_TRANSITIONS) as CrmStage[];
const expected=new Set(stages.flatMap(source=>stages.filter(target=>target!==source).map(target=>`${source}>${target}`)));

test('CRM-01 couvre explicitement les 81 couples de la matrice 9 x 9',()=>{
  assert.equal(stages.length,9);
  let checked=0;
  for(const source of stages)for(const target of stages){
    assert.equal(isCrmStageTransitionAllowed(source,target),expected.has(`${source}>${target}`),`${source} -> ${target}`);
    checked++;
  }
  assert.equal(checked,81);
});

test('CRM-01 seules les transitions identiques sont interdites en l’absence de vente',()=>{
  for(const stage of stages)assert.equal(isCrmStageTransitionAllowed(stage,stage),false,stage);
  assert.equal(isCrmStageTransitionAllowed('won','negotiation'),true);
  assert.equal(isCrmStageTransitionAllowed('lost','offer'),true);
  assert.equal(isCrmStageTransitionAllowed('lost','won'),true);
});

test('CRM-01 le refus précède transaction, activité, notification et temps réel',()=>{
  const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
  const route=source.slice(source.indexOf("crmRouter.patch('/leads/:id/stage'"),source.indexOf("crmRouter.post('/leads/:id/appointments'"));
  const guard=route.indexOf('isCrmStageTransitionAllowed');
  assert.ok(guard>0);
  for(const effect of ['withLockedLeadAuthorization','publishCrmLeadUpdated','notifyCrm'])assert.ok(guard<route.indexOf(effect),effect);
});

test('CRM-01 une vente liée verrouille la transition et les clôtures sont nettoyées',()=>{const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');assert.match(source,/SELECT id,status FROM sales WHERE opportunity_id=\? FOR UPDATE/);assert.match(source,/CRM_STAGE_LINKED_SALE/);assert.match(source,/won_at=IF/);assert.match(source,/lost_reason=\?/);assert.match(source,/converted_at=IF/)});
