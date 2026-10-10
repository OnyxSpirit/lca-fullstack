import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const source=async(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('SAV-OR-16 bloque l’annulation dès ready côté backend et masque PRET côté frontend',async()=>{
  const route=await source('../src/modules/workshop/workshop.routes.ts'),page=await source('../../frontend/src/modules/service/RepairOrderDetailPage.tsx');
  assert.match(route,/\['ready','invoiced','delivered','closed','cancelled'\]\.includes\(ro\.status\)/);
  assert.match(page,/\['PRET','FACTURE','LIVRE','CLOTURE','ANNULE'\]\.includes\(ro\.status\)/);
});

test('SAV-OR-17 conserve les garde-fous d’étape backend',async()=>{
  const route=await source('../src/modules/workshop/workshop.routes.ts');
  assert.match(route,/ensureWritable\(ro,\['planned'\]\)/);
  assert.match(route,/ensureWritable\(ro,\['received','diagnosis'\]\)/);
  assert.match(route,/ensureWritable\(ro,\['waiting_approval'\]\)/);
  assert.match(route,/ensureWritable\(ro,\['in_progress'\]\)/);
  assert.match(route,/repair_order_status!=='in_progress'/);
  assert.match(route,/affectation atelier n’est disponible que pendant les travaux/);
});

test('SAV-OR-18 sépare pointage opérationnel et main-d’œuvre financière',async()=>{
  const route=await source('../src/modules/workshop/workshop.routes.ts'),page=await source('../../frontend/src/modules/service/RepairOrderDetailPage.tsx');
  assert.match(route,/planned_hours,unit_price,line_total,status,request_key\)VALUES\(\?,\?,\?,\?,\?,0,0,'planned'/);
  assert.match(route,/item_type,description,quantity,unit_price,discount,tax_rate,line_total/);
  assert.doesNotMatch(page,/intervention\.rateCode/);
  const interventions=page.slice(page.indexOf('<CardTitle>Interventions / pointage</CardTitle>'),page.indexOf('<CardTitle>Pièces et main-d’œuvre</CardTitle>'));
  const parts=page.indexOf('<CardTitle>Pièces et main-d’œuvre</CardTitle>'),billable=page.indexOf('<CardTitle>Réel facturable</CardTitle>');
  assert.doesNotMatch(interventions,/Définir le facturable/);
  assert.ok(parts>0&&parts<billable);
  assert.match(page.slice(billable),/Définir le facturable/);
  assert.match(page.slice(billable),/Disponible après création de l’intervention/);
});
