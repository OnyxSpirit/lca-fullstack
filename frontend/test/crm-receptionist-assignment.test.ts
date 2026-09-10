import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {eligibleShowroomSalesUsers} from '../src/modules/showroom/showroomPolicy.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('REC-CRM-01..05 le sélecteur Réceptionniste ne propose que les commerciaux actifs de son agence',()=>{
  const users=[
    {id:'agent',status:'active',agencyId:'1',roles:['SALES_REP'],role:'SALES_REP'},
    {id:'manager',status:'active',agencyId:'1',roles:['SALES_MANAGER'],role:'SALES_MANAGER'},
    {id:'other',status:'active',agencyId:'2',roles:['SALES_REP'],role:'SALES_REP'},
    {id:'accountant',status:'active',agencyId:'1',roles:['ACCOUNTANT'],role:'ACCOUNTANT'},
    {id:'technician',status:'active',agencyId:'1',roles:['TECHNICIAN'],role:'TECHNICIAN'},
    {id:'reception',status:'active',agencyId:'1',roles:['RECEPTIONIST'],role:'RECEPTIONIST'},
    {id:'inactive',status:'inactive',agencyId:'1',roles:['SALES_REP'],role:'SALES_REP'},
  ];
  assert.deepEqual(eligibleShowroomSalesUsers(users,'1').map(user=>user.id),['agent','manager']);
  const modal=read('../src/modules/crm/NewLeadModal.tsx');
  assert.match(modal,/canAssignTeam=roles\.includes\('RECEPTIONIST'\)/);
  assert.match(modal,/Conseiller commercial/);
  assert.match(modal,/<option value="">À affecter<\/option>/);
  assert.match(modal,/Le prospect sera créé comme non affecté/);
});

test('REC-CRM-10/11 l’UI limite l’affectation Réceptionniste au prospect Nouveau non affecté',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx');
  assert.match(page,/selectedLead\.stage==='NOUVEAU'&&!selectedLead\.assignedToId/);
  assert.match(page,/isReceptionist\?'Affecter':'Modifier'/);
  assert.match(page,/payload=isReceptionist\?\{id:editLead\.id,assignedUserId:editLead\.assignedToId\}/);
  assert.match(page,/disabled=\{isReceptionist&&!editLead\.assignedToId\}/);
});

test('REC-CRM-12/13 les parcours commerciaux restent disponibles',()=>{
  const page=read('../src/modules/crm/CrmPage.tsx');
  assert.match(page,/const isSalesManager=roles\.includes\('SALES_MANAGER'\)/);
  assert.match(page,/canUpdateStage/);
  assert.match(page,/!isReceptionist\|\|/);
});
