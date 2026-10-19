import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const page=readFileSync(new URL('../src/modules/notifications/NotificationsPage.tsx',import.meta.url),'utf8');
const types=readFileSync(new URL('../src/types/notifications.ts',import.meta.url),'utf8');

test('B348-F01 le contrat frontend distingue auteur humain, système et historique inconnu',()=>{
  assert.match(types,/actorType:'human'\|'system'\|'unknown'/);
  assert.match(page,/n\.actorType==='system'\?'Système'/);
  assert.match(page,/Auteur historique non disponible/);
});

test('B348-F02 le contexte agence affiché vient exclusivement du snapshot',()=>{
  assert.match(page,/n\.operationAgencyNameSnapshot/);
  assert.match(page,/Contexte historique indisponible/);
  assert.match(page,/Contexte territorial non applicable/);
  assert.doesNotMatch(page,/currentUser\.agency/);
});
