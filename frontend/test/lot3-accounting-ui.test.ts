import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel=readFileSync(new URL('../src/modules/treasury/AccountingEntriesPanel.tsx',import.meta.url),'utf8');
const hooks=readFileSync(new URL('../src/api/accountingEntryHooks.ts',import.meta.url),'utf8');

test('LOT3 expose le cycle de vie comptable en français',()=>{
  for(const label of ['Nouvelle écriture','Nouvelle pièce comptable','Enregistrer le brouillon','Valider','Comptabiliser','Contrepasser','Période ouverte']) assert.match(panel,new RegExp(label));
  assert.match(panel,/Écart/);
  assert.match(panel,/Aucune écriture comptable/);
});

test('LOT3 utilise les API réelles et des exports CSV et XLSX',()=>{
  assert.match(hooks,/\/accounting\/entries/);
  assert.match(panel,/export\/\$\{format\}/);
  assert.match(panel,/'csv'\|'xlsx'/);
});
