import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const service = readFileSync(new URL('../src/modules/accounting/accounting-integration.service.ts', import.meta.url), 'utf8');

test('les jointures source_id du worker imposent la collation de la colonne cible', () => {
  const joins = service.match(/source_id=CAST\([^)]* AS CHAR\) COLLATE utf8mb4_unicode_ci/g) ?? [];
  assert.equal(joins.length, 4);
  assert.doesNotMatch(service, /source_id=CAST\([^)]* AS CHAR\)(?! COLLATE)/);
});
