import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {eligibleShowroomSalesUsers} from '../src/modules/showroom/showroomPolicy.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('REC-CRM-01..05 le sélecteur Réceptionniste ne propose que les commerciaux actifs de son agence',()=>{
  const users=[
    {id:'agent',status:'active',agencyId:'1',roles:['ROLE_A'],role:'RECEPTIONIST',permissions:{'sales.create':'OWN'}},
    {id:'manager',status:'active',agencyId:'1',roles:['ROLE_B'],role:'RECEPTIONIST',permissions:{'crm.prospect.update':'AGENCY'}},
    {id:'other',status:'active',agencyId:'2',roles:['ROLE_C'],role:'RECEPTIONIST',permissions:{'sales.create':'OWN'}},
    {id:'accountant',status:'active',agencyId:'1',roles:['ROLE_D'],role:'RECEPTIONIST',permissions:{}},
    {id:'technician',status:'active',agencyId:'1',roles:['ROLE_E'],role:'RECEPTIONIST',permissions:{}},
    {id:'reception',status:'active',agencyId:'1',roles:['ROLE_F'],role:'RECEPTIONIST',permissions:{}},
    {id:'inactive',status:'inactive',agencyId:'1',roles:['ROLE_G'],role:'RECEPTIONIST',permissions:{'sales.create':'OWN'}},
  ];
  assert.deepEqual(eligibleShowroomSalesUsers(users as any,'1').map(user=>user.id),['agent','manager']);
  const modal=read('../src/modules/crm/NewLeadModal.tsx');
  assert.match(modal,/state\.can\('crm\.prospect\.assign'\)/);
  assert.match(modal,/Conseiller commercial/);
  assert.match(modal,/<option value="">À affecter<\/option>/);
  assert.match(modal,/Le prospect sera créé comme non affecté/);
});

test('REC-CRM-10/11 l’UI gouverne l’affectation avec crm.prospect.assign',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx');
  assert.match(page,/canAssignLead=can\('crm\.prospect\.assign'\)/);
  assert.match(page,/canAssignLead\?\{assignedUserId:editLead\.assignedToId\}/);
  assert.match(page,/!canUpdateLead&&canAssignLead&&!editLead\.assignedToId/);
});

test('REC-CRM-12/13 les parcours commerciaux restent disponibles',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx');
  assert.match(page,/canUpdateStage = can\('crm\.pipeline\.advance'\)/);
  assert.match(page,/canUpdateStage/);
  assert.doesNotMatch(page,/isReceptionist|isSalesManager/);
});
