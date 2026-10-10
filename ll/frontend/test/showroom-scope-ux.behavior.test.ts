import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {eligibleShowroomSalesUsers,showroomAgencyOptions} from '../src/modules/showroom/showroomPolicy.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const agencies=[{id:'A1',name:'Agence 1'},{id:'A2',name:'Agence 2'}];

test('SHOWROOM-SCOPE-UX-01 conserve une cible unique pour un utilisateur mono-agence',()=>{
  assert.deepEqual(showroomAgencyOptions([], 'A1').map(agency=>agency.id),['A1']);
  assert.deepEqual(showroomAgencyOptions([agencies[0]!], 'A1').map(agency=>agency.id),['A1']);
});

test('SHOWROOM-SCOPE-UX-02 expose exactement les agences autorisées par le backend',()=>{
  assert.deepEqual(showroomAgencyOptions(agencies,'A1').map(agency=>agency.id),['A1','A2']);
  assert.equal(showroomAgencyOptions(agencies,'A1').some(agency=>agency.id==='B1'),false);
});

test('SHOWROOM-SCOPE-UX-03 recalcule les commerciaux depuis l’agence de chaque visite',()=>{
  const users=[
    {id:'CA1',status:'active',agencyId:'A1',permissions:{'sales.create':'AGENCY'}},
    {id:'CA2',status:'active',agencyId:'A2',permissions:{'crm.prospect.update':'AGENCY'}},
    {id:'CB1',status:'active',agencyId:'B1',permissions:{'sales.create':'AGENCY'}},
  ];
  assert.deepEqual(eligibleShowroomSalesUsers(users,'A1').map(user=>user.id),['CA1']);
  assert.deepEqual(eligibleShowroomSalesUsers(users,'A2').map(user=>user.id),['CA2']);
  assert.deepEqual(eligibleShowroomSalesUsers(users,'B1').map(user=>user.id),['CB1']);
});

test('SHOWROOM-SCOPE-UX-04 les hooks dédiés transmettent agence cible et permissions Showroom',()=>{
  const page=read('../src/modules/showroom/ShowroomPage.tsx'),hooks=read('../src/api/erpHooks.ts');
  assert.match(page,/useShowroomCreateAgenciesQuery\(canRegister\)/);
  assert.match(page,/useShowroomSalesCandidatesQuery\(visit\.agencyId,true\)/);
  assert.match(page,/agencyId:creationAgencyId/);
  assert.match(page,/createAgencies\.length>1/);
  assert.match(hooks,/\/showroom\/agencies\/visitor-create/);
  assert.match(hooks,/\/showroom\/agencies\/\$\{agencyId\}\/sales-candidates/);
});
