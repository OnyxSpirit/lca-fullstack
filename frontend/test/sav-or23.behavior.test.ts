import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = (path: string) => readFile(new URL(`../src/${path}`, import.meta.url), 'utf8');

test('SAV-OR-23 reconstruit le verrou serveur et masque les actions sensibles', async () => {
  const [page, hooks, types] = await Promise.all([
    source('modules/service/RepairOrderDetailPage.tsx'),
    source('api/erpHooks.ts'),
    source('types/index.ts'),
  ]);
  assert.match(types, /workStarted:boolean/);
  assert.match(hooks, /workStarted:Boolean\(r\.workStarted\)/);
  assert.match(page, /can\('service\.order\.abandon'\)&&!ro\.workStarted/);
  assert.match(page, /can\('service\.order\.cancel'\)&&!ro\.workStarted/);
  assert.doesNotMatch(page, /useState\([^\n]*workStarted/i);
  assert.match(page, /Disponible uniquement avant le début effectif des travaux/);
});

test('SAV-OR-23 préserve le verrou SAV-OR-22 et le workflow', async () => {
  const page = await source('modules/service/RepairOrderDetailPage.tsx');
  assert.match(page, /qualityTransitionBlocked=nextTransitions\.includes\('CONTROLE_QUALITE'\)&&!ro\.actualBillable\.confirmed/);
  assert.match(page, /Complétez et validez le réel facturable avant de passer au contrôle qualité/);
  assert.match(page, /EN_COURS:\['CONTROLE_QUALITE'\]/);
});

