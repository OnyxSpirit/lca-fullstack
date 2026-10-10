import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const page=()=>readFile(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');

test('les étapes futures expliquent leur verrouillage et les étapes passées restent consultables',async()=>{
  const source=await page();
  for(const message of ['Disponible après réception du véhicule.','Disponible après finalisation du diagnostic et du chiffrage.','Disponible après validation du client et démarrage des travaux.','Disponible après achèvement des interventions.','consultation uniquement'])assert.match(source,new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(source,/ro\.diagnostics\?\.map/);assert.match(source,/ro\.approvals\?\.map/);assert.match(source,/ro\.interventions\?\.map/);assert.match(source,/ro\.qualityControls\?\.map/);
});

test('PRET masque l’annulation et la saisie opérationnelle ne contient aucun tarif',async()=>{
  const source=await page();
  assert.match(source,/\['PRET','FACTURE','LIVRE','CLOTURE'\]/);
  assert.doesNotMatch(source,/intervention\.rateCode/);
  assert.match(source,/Temps facturé et tarif client/);
  assert.match(source,/flex-wrap/);
});
