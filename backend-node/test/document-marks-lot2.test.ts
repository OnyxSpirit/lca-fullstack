import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = source('database/migrations/080_document_mark_policies.sql');
const routes = source('src/modules/document-marks/document-mark.routes.ts');
const resolver = source('src/modules/document-marks/document-mark-policy.service.ts');
const archive = source('src/modules/documents/business-document.service.ts');
const layout = source('src/modules/documents/document-layout.ts');
const commercial = source('src/modules/documents/commercial-document.ts');
const settings = source('../frontend/src/modules/settings/DocumentMarksSettings.tsx');
const pad = source('../frontend/src/modules/settings/SignaturePad.tsx');
const roles = source('../frontend/src/modules/users/RoleManagementPanel.tsx');

test('LOT2 migration additive: catégories, rôles, politiques et snapshots', () => {
  for (const token of ['service_stamp_categories', 'service_stamp_role_authorizations', 'document_mark_policies', 'policy_id', 'category_id']) {
    assert.match(migration, new RegExp(token));
  }
  assert.match(migration, /UNIQUE KEY uq_stamp_category_name\(concession_id,name\)/);
  assert.match(migration, /UNIQUE KEY uq_document_mark_policy/);
  assert.doesNotMatch(migration, /DROP TABLE|TRUNCATE|DELETE FROM/);
});

test('LOT2 conserve le stockage et le versionnement existants', () => {
  assert.match(routes, /storeDocument/);
  assert.match(routes, /UPDATE user_signature_versions SET is_active=FALSE/);
  assert.match(routes, /UPDATE service_stamp_versions SET is_active=FALSE/);
  assert.match(routes, /signature\.revoked/);
  assert.doesNotMatch(routes, /DELETE FROM user_signature_versions|DELETE FROM service_stamp_versions/);
});

test('LOT2 résolution déterministe et contrôle serveur des cachets', () => {
  assert.match(resolver, /default_stamp_id/);
  assert.match(resolver, /candidates\.length===1/);
  assert.match(resolver, /STAMP_SELECTION_REQUIRED/);
  assert.match(resolver, /Le cachet sélectionné n’est pas autorisé/);
  assert.match(resolver, /missing_mark_behavior==='BLOCK'/);
  assert.match(resolver, /service_stamp_role_authorizations/);
  assert.match(resolver, /st\.document_context=\?/);
  assert.match(resolver, /st\.is_active=TRUE/);
});

test('LOT2 documents officiels intégrés et historique jamais recalculé', () => {
  for (const type of ['QUOTATION', 'SALE_ORDER', 'INVOICE', 'PAYMENT_RECEIPT']) assert.match(archive, new RegExp(`documentType:'${type}'`));
  assert.match(archive, /existingArchive\(sourceKey\);if\(existing\)return existing/);
  assert.match(archive, /afterInsertOnly:true/);
  assert.match(archive, /snapshotResolvedMarks/);
  assert.match(commercial, /drawOfficialMarks/);
  assert.match(layout, /fit:\[180,85\]/);
  assert.match(layout, /doc\.addPage\(\)/);
  assert.match(archive, /archiveDelivery/);
});

test('LOT2 interface: import ou dessin, catégories, politiques et rôles', () => {
  assert.match(settings, /signatureMode==='import'/);
  assert.match(settings, /SignaturePad/);
  assert.match(pad, /onPointerDown/);
  assert.match(pad, /Effacer|Recommencer/);
  assert.match(settings, /Catégories de cachets/);
  assert.match(settings, /Documents officiels · Politiques/);
  assert.match(roles, /Cachets autorisés/);
  assert.match(roles, /useSaveRoleStamps/);
});

test('LOT2 aucune extension RBAC parallèle', () => {
  for (const permission of ['signature.view.self', 'signature.manage.self', 'stamp.view', 'stamp.manage']) assert.match(routes, new RegExp(permission.replaceAll('.', '\\.')));
  assert.match(resolver, /document\.signature\.apply/);
  assert.match(resolver, /stamp\.use/);
  assert.doesNotMatch(migration, /INSERT INTO permissions|INSERT INTO roles/);
});
