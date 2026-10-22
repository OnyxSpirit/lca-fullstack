import assert from'node:assert/strict';
import test from'node:test';
import{readFileSync}from'node:fs';

const showroom=readFileSync(new URL('../src/modules/showroom/showroom.routes.ts',import.meta.url),'utf8');
const vehicles=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');
const crm=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');

test('CRM-02 distingue les notifications de planification et de démarrage',()=>{
  assert.match(showroom,/showroom:test-drive-planned/);
  assert.match(showroom,/showroom:test-drive-started/);
  assert.match(showroom,/Essai routier planifié/);
});

test('CRM-02 exclut explicitement les véhicules réservés des sélecteurs d’essai',()=>{
  assert.match(vehicles,/excludeTestDriveReserved/);
  assert.match(vehicles,/NOT EXISTS\(SELECT 1 FROM showroom_test_drives active_drive/);
  assert.match(vehicles,/active_drive\.status IN\('planned','in_progress'\)/);
});

test('CRM-02 transforme les chevauchements de rendez-vous et d’essais en avertissements',()=>{
  assert.match(crm,/warnings\.push\('Un essai routier est déjà planifié/);
  assert.match(crm,/warnings\.push\('Un autre rendez-vous est déjà planifié/);
  assert.doesNotMatch(crm,/CRM_APPOINTMENT_TEST_DRIVE_CONFLICT/);
  assert.doesNotMatch(crm,/code:'CRM_APPOINTMENT_CONFLICT'/);
});
