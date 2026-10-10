import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const crm=source('src/modules/crm/crm.routes.ts');
const quotation=source('src/modules/quotations/quotation.service.ts');
const showroom=source('src/modules/showroom/showroom.routes.ts');
const page=source('../frontend/src/modules/crm/CrmPage.tsx');

test('VALID-ERP-02 activité CRM : auteur de session et responsable restent distincts',()=>{
  assert.match(crm,/assigned_user_id,created_by,type/);
  assert.match(crm,/lead\.assigned_user_id,request\.user!\.sub,type/);
  assert.match(page,/Auteur : \{activity\.createdByName\|\|'Auteur non renseigné'\}/);
  assert.match(page,/Responsable : \{activity\.assignedUserName\|\|'Non affecté'\}/);
});

test('VALID-ERP-02 conversion : une entreprise reste un client entreprise',()=>{
  assert.match(quotation,/customerType=opportunity\.company_name\?'company':'individual'/);
  assert.match(quotation,/temporary,customerType,agencyId/);
});

test('VALID-ERP-02D/02E protège les créneaux d’essai par véhicule, commercial et rendez-vous',()=>{
  const policy=source('src/modules/showroom/showroom-test-drive.ts');
  assert.match(policy,/FROM vehicles WHERE id=\? FOR UPDATE/);
  assert.match(policy,/FROM users WHERE id=\? FOR UPDATE/);
  assert.match(policy,/showroom_test_drives WHERE vehicle_id=\? AND \$\{overlap\}/);
  assert.match(policy,/showroom_test_drives WHERE advisor_id=\? AND \$\{overlap\}/);
  assert.match(policy,/scheduled_at<\? AND DATE_ADD/);
  assert.match(showroom,/assertTestDriveStartAvailable\(connection/);
});
