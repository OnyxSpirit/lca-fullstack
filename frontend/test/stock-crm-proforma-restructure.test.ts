import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('le Stock expose les unités et modèles sur commande sans entrée principale Catalogue',()=>{
  const stock=read('../src/modules/vehicles/VehiclesListPage.tsx'),sidebar=read('../src/components/layout/Sidebar.tsx'),app=read('../src/App.tsx');
  assert.match(stock,/Modèles sur commande/);
  assert.doesNotMatch(sidebar,/Catalogue commercial/);
  assert.match(app,/vehicles\/catalog.*Navigate to="\/vehicles"/s);
});

test('la fiche véhicule lance une pro forma avec le véhicule préselectionné',()=>{
  const detail=read('../src/modules/vehicles/VehicleDetailPage.tsx'),proformas=read('../src/modules/proformas/ProformasPage.tsx');
  assert.match(detail,/Générer une pro forma/);
  assert.match(detail,/proformas\?vehicleId=/);
  assert.match(proformas,/searchParams\.get\('vehicleId'\)/);
});

test('le CRM propose toutes les étapes et verrouille les cartes terminales',()=>{
  const crm=read('../src/modules/crm/CrmPage.tsx');
  assert.match(crm,/draggable=\{canUpdateStage&&!\['GAGNE','PERDU'\]\.includes\(lead\.stage\)\}/);
  assert.match(crm,/\{stages\.map\(\(s\)/);
  assert.doesNotMatch(crm,/\['NOUVEAU','CONTACTE'\]\.includes\(selectedLead\.stage\)/);
});
