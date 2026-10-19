import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const page=readFileSync(new URL('../src/modules/users/UsersManagementPage.tsx',import.meta.url),'utf8');
const hooks=readFileSync(new URL('../src/api/userHooks.ts',import.meta.url),'utf8');

test('B3420 restaure le choix employé et les quatre champs RH historiques',()=>{
  assert.match(page,/Employé de la concession/);
  for(const field of ['employeeNumber','employeePosition','employeeHireDate','employeeStatus'])assert.match(page,new RegExp(field));
  assert.match(page,/form\.isEmployee&&/);
});

test('B3420 création et modification transmettent le contrat RH seulement avec la permission',()=>{
  assert.match(page,/canManageEmployees=auth\.can\('hr\.employees\.manage'\)/);
  assert.match(page,/canManageEmployees\?form/);
  assert.match(page,/if\(canManageEmployees\)Object\.assign/);
  assert.match(hooks,/isEmployee\?:boolean/);
});

test('B3420 recharge Personnel après création, modification ou photo ERP',()=>{
  assert.match(hooks,/invalidateQueries\(\{queryKey:\['hr'\]\}\)/);
  assert.match(hooks,/avatar:useMutation/);
  assert.match(hooks,/deleteAvatar:useMutation/);
});

test('B3420 le passage historique Sorti vers Oui réactive explicitement le statut',()=>{
  assert.match(page,/employeeStatus:e\.target\.value==='yes'&&form\.employeeStatus==='departed'\?'active'/);
});
