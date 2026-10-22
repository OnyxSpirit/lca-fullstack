import assert from'node:assert/strict';
import test from'node:test';
import{readFileSync}from'node:fs';

const crmModal=readFileSync(new URL('../src/modules/crm/CrmTestDriveModal.tsx',import.meta.url),'utf8');
const showroom=readFileSync(new URL('../src/modules/showroom/ShowroomPage.tsx',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('../src/components/AppBootstrap.tsx',import.meta.url),'utf8');

test('CRM-02 demande des véhicules non réservés dans les deux parcours',()=>{
  assert.match(crmModal,/excludeTestDriveReserved:true/);
  assert.match(showroom,/excludeTestDriveReserved:true/);
});

test('CRM-02 conserve la réservation courante lors de la reprogrammation',()=>{
  assert.match(showroom,/réservation actuelle/);
});

test('CRM-02 invalide le Showroom lors d’une nouvelle planification',()=>{
  assert.match(bootstrap,/showroom:test-drive-planned/);
});
