import assert from 'node:assert/strict';
import { readContractFileSync as readFileSync } from './helpers/source-contract';
import test from 'node:test';
import { financialCsv } from '../src/modules/reports/report.csv.js';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const migration = read('database/migrations/082_stamp_revocation.sql');
const lifecycle = read('src/modules/document-marks/stamp-lifecycle.routes.ts');
const marks = read('src/modules/document-marks/document-mark.routes.ts');
const treasury = read('src/modules/treasury/treasury.service.ts');
const routes = read('src/modules/treasury/treasury.routes.ts');
const ui = read('../frontend/src/modules/settings/DocumentMarksSettings.tsx');
const treasuryUi = read('../frontend/src/modules/treasury/TreasuryPage.tsx');

test('cachet : révocation traçable, définitive et historique préservé', () => {
  for (const token of ['revoked_by', 'revoked_at', 'revocation_reason', 'fk_service_stamp_revoker']) assert.match(migration, new RegExp(token));
  assert.match(lifecycle, /transaction\(async connection/);
  assert.match(lifecycle, /stamp\.revoked/);
  assert.match(lifecycle, /UPDATE service_stamp_versions SET is_active=FALSE/);
  assert.match(lifecycle, /Un cachet révoqué ne peut pas être réactivé/);
  assert.match(marks, /is_active=TRUE AND revoked_at IS NULL/);
  assert.match(ui, /Révoqué le/);
});

test('cachet : suppression physique refuse toute référence officielle', () => {
  for (const dependency of ['document_mark_snapshots', 'delivery_signatures', 'document_mark_policies']) assert.match(lifecycle, new RegExp(dependency));
  assert.match(lifecycle, /FOR UPDATE/);
  assert.match(lifecycle, /Ce cachet a déjà été utilisé dans des documents/);
  assert.match(lifecycle, /stamp\.deleted/);
  assert.doesNotMatch(lifecycle, /DELETE FROM document_mark_snapshots|DELETE FROM delivery_signatures/);
});

test('CSV financier : sécurité Excel, BOM, filtres complets et aucune pagination', () => {
  const csv = financialCsv([['Libellé', 'Montant'], ['=CMD()', 42], [' normal', -7]]);
  assert.equal(Buffer.from(csv).subarray(0, 3).toString('hex'), 'efbbbf');
  assert.match(csv, /"'=CMD\(\)";"42"/);
  assert.match(csv, /\r\n/);
  assert.match(routes, /\/treasury\/journal\/export/);
  assert.match(routes, /financialCsv/);
  assert.match(treasury, /treasury\.journal\.exported/);
  assert.match(treasury, /rowCount:rows\.length/);
  const exportBody = treasury.slice(treasury.indexOf('export async function journalExport'), treasury.indexOf('export async function movement'));
  assert.doesNotMatch(exportBody, /LIMIT|OFFSET|pageSize/);
  for (const filter of ['accountId', 'categoryId', 'direction', 'sourceType', 'from', 'to', 'reference']) assert.match(exportBody, new RegExp(filter));
  assert.match(treasuryUi, /Exporter en CSV/);
});
