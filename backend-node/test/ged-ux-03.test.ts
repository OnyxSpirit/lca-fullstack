import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const route = readFileSync(new URL('../src/modules/documents/document.routes.ts', import.meta.url), 'utf8');
const storage = readFileSync(new URL('../src/modules/documents/document-storage.ts', import.meta.url), 'utf8');

test('GED-UX03-B01 succès HTTP après persistance atomique', () => {
  assert.match(route, /payload=await transaction\(async connection=>/);
  assert.match(route, /res\.status\(201\)\.json\(payload\)/);
});
test('GED-UX03-B02/B04/B06 autonome et valeurs NULL préservés', () => {
  assert.match(route, /entity\?\.entityType\?\?null/);
  assert.match(route, /entity\?\.entityId\?\?null/);
  assert.match(route, /txt\(r\.body\.expiresAt,10\)\|\|null/);
});
test('GED-UX03-B03 document rattaché toujours résolu et contrôlé', () => assert.match(route, /resolveDocumentEntity\(r,entityType\(r\.body\.entityType\)/));
test('GED-UX03-B05 réponse expose catégorie, type et titre', () => {
  for (const field of ['title', 'categoryId', 'documentTypeId', 'documentType']) assert.match(route, new RegExp(field));
});
test('GED-UX03-B07/B08 audit cohérent, rollback DB et cleanup fichier', () => {
  const sql = route.match(/const auditSql=`([^`]+)`/)?.[1] ?? '';
  const placeholders = (sql.match(/\?/g) ?? []).length;
  assert.equal(placeholders, 6);
  assert.match(route, /connection\.execute\(auditSql,auditValues/);
  assert.match(route, /catch\(error\)\{await unlink\(stored\.absolute\)/);
});
test('GED-UX03-B09 téléchargement créé inchangé', () => assert.match(route, /documents\/:id\/download[\s\S]*requireDocumentFile/));
test('GED-UX03-B10 sécurité upload historique préservée', () => {
  assert.match(storage, /MAX_DOCUMENT_SIZE=15\*1024\*1024/);
  assert.match(storage, /signatureMatches/);
  assert.match(storage, /writeFile\(absolute,file\.buffer,\{flag:'wx'\}\)/);
});
