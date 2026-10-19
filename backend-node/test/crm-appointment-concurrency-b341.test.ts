import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
const creation=source.slice(source.indexOf("crmRouter.post('/leads/:id/appointments'"),source.indexOf("crmRouter.patch('/leads/:id/appointments/:appointmentId'"));

test('B341 concurrence sérialise le contexte métier avant le contrôle et l’insertion',()=>{
  const parentLock=creation.indexOf("SELECT stage FROM opportunities WHERE id=? FOR UPDATE"),duplicateCheck=creation.indexOf("f.lead_id=? AND f.opportunity_id=?"),insert=creation.indexOf('INSERT INTO follow_ups');
  assert.ok(parentLock>=0&&duplicateCheck>parentLock&&insert>duplicateCheck);
  assert.match(creation,/CRM_APPOINTMENT_DUPLICATE/);
});

test('B341 le chevauchement dérogeable ne peut jamais contourner le doublon métier',()=>{
  assert.ok(creation.indexOf('CRM_APPOINTMENT_DUPLICATE')<creation.indexOf("if\(!override\)throw new HttpError"));
});
