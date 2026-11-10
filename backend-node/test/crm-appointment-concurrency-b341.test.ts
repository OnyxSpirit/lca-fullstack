import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
const creation=source.slice(source.indexOf("crmRouter.post('/leads/:id/appointments'"),source.indexOf("crmRouter.patch('/leads/:id/appointments/:appointmentId'"));

test('B341 concurrence sérialise le contexte métier avant le contrôle et l’insertion',()=>{
  assert.match(source,/withLockedLeadAuthorization[\s\S]*FROM leads l JOIN opportunities o ON o\.lead_id=l\.id WHERE l\.id=\? FOR UPDATE/);
  const duplicateCheck=creation.indexOf("f.lead_id=? AND f.opportunity_id=?"),insert=creation.indexOf('INSERT INTO follow_ups');
  assert.ok(duplicateCheck>=0&&insert>duplicateCheck);
  assert.match(creation,/CRM_APPOINTMENT_DUPLICATE/);
});

test('B341 le doublon exact reste bloquant avant les avertissements de chevauchement',()=>{
  assert.ok(creation.indexOf('CRM_APPOINTMENT_DUPLICATE')<creation.indexOf("warnings.push('Un autre rendez-vous"));
});
