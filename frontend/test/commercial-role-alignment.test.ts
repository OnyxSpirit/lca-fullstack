import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {appointmentDateError,appointmentIso} from '../src/modules/crm/crmAppointmentPolicy.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('COM-RM-01 valide date et heure, explique le blocage et produit un instant ISO',()=>{
  const now=new Date('2026-09-09T10:00:00Z');
  assert.match(appointmentDateError('',now)??'',/date et l’heure/);
  assert.match(appointmentDateError('2026-09-09T09:00:00Z',now)??'',/futur/);
  assert.equal(appointmentDateError('2026-09-09T11:00:00Z',now),null);
  assert.equal(appointmentIso('2026-09-09T11:00:00Z'),'2026-09-09T11:00:00.000Z');
  const page=read('../src/modules/crm/CrmPage.tsx'),policy=read('../src/modules/crm/crmAppointmentPolicy.ts');
  assert.match(page,/disabled=\{Boolean\(appointmentDateError\(scheduledAt\)\)\}/);
  assert.match(policy,/Renseignez la date et l’heure/);
});

test('COM-RM-04 expose commercial, étape et priorité au manager et les envoie au backend',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx'),hooks=read('../src/api/erpHooks.ts');
  assert.match(page,/isSalesManager&&/);
  assert.match(page,/Filtrer par étape/);
  assert.match(page,/Filtrer par commercial/);
  assert.match(hooks,/params\.set\("stage", stage\)/);
  assert.match(hooks,/params\.set\("commercialId", commercialId\)/);
});

test('COM-RM-05 cache la gestion d’équipe au commercial et la conserve au manager',()=>{
  const modal=read('../src/modules/crm/NewLeadModal.tsx');
  assert.match(modal,/canAssignTeam/);
  assert.match(modal,/roles\.includes\('SALES_MANAGER'\)/);
  assert.match(modal,/automatiquement affecté à votre portefeuille/);
});

test('le devis permet au propriétaire ou au manager de l’émettre, expose le PDF et conserve le propriétaire',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx'),pdf=read('../src/services/businessPdf.ts');
  assert.match(page,/canIssueQuotation&&quotation\.status==='draft'/);
  assert.match(page,/Émettre le devis/);
  assert.match(page,/useValidateQuotation/);
  assert.match(page,/openBusinessPdf\('quotation'/);
  assert.match(pdf,/\/quotations\/\$\{id\}\/pdf/);
});
