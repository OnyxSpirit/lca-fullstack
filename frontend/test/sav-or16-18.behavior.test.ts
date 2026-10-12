import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const page=()=>readFile(new URL('../src/modules/service/RepairOrderDetailPage.tsx',import.meta.url),'utf8');

test('les étapes futures expliquent leur verrouillage et les étapes passées restent consultables',async()=>{
  const source=await page();
  for(const message of ['Disponible après réception du véhicule.','Disponible pendant le diagnostic et avant la décision client.','Disponible après validation du client et démarrage des travaux.','Disponible après achèvement des interventions.','consultation uniquement'])assert.match(source,new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(source,/ro\.diagnostics\?\.map/);assert.match(source,/ro\.approvals\?\.map/);assert.match(source,/ro\.interventions\?\.map/);assert.match(source,/ro\.qualityControls\?\.map/);
});

test('PRET masque l’annulation et la saisie opérationnelle ne contient aucun tarif',async()=>{
  const source=await page();
  assert.match(source,/\['PRET','FACTURE','LIVRE','CLOTURE','ANNULE'\]\.includes\(ro\.status\)/);
  assert.doesNotMatch(source,/intervention\.rateCode/);
  assert.match(source,/Autorisé, pointé et facturable restent trois valeurs indépendantes/);
  assert.match(source,/Les éléments autorisés, pointés, consommés et facturables restent distincts/);
  assert.match(source,/flex-wrap/);
});
