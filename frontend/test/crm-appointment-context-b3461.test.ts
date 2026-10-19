import assert from 'node:assert/strict';
import test from 'node:test';
import {canManageCrmAppointment,canPlanCrmAppointment} from '../src/modules/crm/crmAppointmentPolicy.js';

const lead=(stage:string,active=true)=>({stage,activeAppointment:active?{id:'7',scheduledAt:'2099-01-01',durationMinutes:30,subject:'RDV'}:null}) as any;

test('B3461 la planification initiale reste possible depuis Qualifié',()=>{
  assert.equal(canPlanCrmAppointment(lead('QUALIFIE',false)),true);
  assert.equal(canManageCrmAppointment(lead('QUALIFIE')),false);
});

test('B3461 les actions de gestion sont réservées à un rendez-vous actif à l’étape RDV',()=>{
  assert.equal(canManageCrmAppointment(lead('RDV')),true);
  assert.equal(canManageCrmAppointment(lead('RDV',false)),false);
  for(const stage of ['ESSAI','OFFRE','NEGOCIATION','GAGNE','PERDU']){
    assert.equal(canManageCrmAppointment(lead(stage)),false);
    assert.equal(canPlanCrmAppointment(lead(stage,false)),false);
  }
});
