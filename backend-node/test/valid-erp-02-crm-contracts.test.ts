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

test('VALID-ERP-02 réserve essais : le démarrage ne verrouille ni véhicule ni commercial',()=>{
  const starts=showroom.match(/post\('\/showroom[^]*?response\.status\(201\)/g)??[];
  assert.ok(starts.length>=2);
  for(const route of starts.slice(0,2)){
    assert.doesNotMatch(route,/FROM vehicles[^`]*FOR UPDATE/);
    assert.doesNotMatch(route,/showroom_test_drives[^]*advisor_id[^]*status='in_progress'[^]*FOR UPDATE/s);
  }
});
