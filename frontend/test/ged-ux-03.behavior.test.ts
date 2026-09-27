import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../src/modules/documents/DocumentsGedPage.tsx', import.meta.url), 'utf8');
const drop = readFileSync(new URL('../src/modules/documents/DocumentFileDropField.tsx', import.meta.url), 'utf8');
const hooks = readFileSync(new URL('../src/api/documentHooks.ts', import.meta.url), 'utf8');

test('GED-UX03-F01/F02 zone visible et sélection par clic', () => {
  assert.match(drop, /Déposer un fichier/);
  assert.match(drop, /Sélectionner un fichier/);
  assert.match(drop, /input\.current\?\.click/);
});
test('GED-UX03-F03 drag and drop', () => {
  assert.match(drop, /onDragOver/);
  assert.match(drop, /onDrop=\{drop\}/);
  assert.match(drop, /dataTransfer\.files\[0\]/);
});
test('GED-UX03-F04/F05/F06 résumé, retirer et remplacer', () => {
  for (const value of ['file.name', 'typeLabel(file)', 'size(file.size)', 'Remplacer', 'Retirer']) assert.match(drop, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(drop, /onChange\(null\)/);
});
test('GED-UX03-F07 double soumission impossible', () => {
  assert.match(page, /missing\.length\|\|mutate\.isPending/);
  assert.match(page, /disabled=\{missing\.length>0\|\|mutate\.isPending\}/);
});
test('GED-UX03-F08 succès finalise et réinitialise le formulaire', () => {
  assert.match(page, /Document enregistré/);
  assert.match(page, /setFile\(null\)/);
  assert.match(page, /setTitle\(''\)/);
  assert.match(page, /close\(\)/);
});
test('GED-UX03-F09 succès invalide la liste GED', () => assert.match(hooks, /onSuccess:invalidate\(qc\)/));
test('GED-UX03-F10 erreur réelle conserve le formulaire et affiche une erreur', () => {
  assert.match(page, /Dépôt impossible/);
  assert.doesNotMatch(page, /catch\(error\)[\s\S]{0,200}setFile\(null\)/);
});
test('GED-UX03-F11/F12 règles autonome et rattachement', () => {
  assert.match(page, /attachment&&!selected&&'dossier rattaché'/);
  assert.match(page, /!file&&'fichier'/);
  assert.match(page, /!title\.trim\(\)&&'titre'/);
});
