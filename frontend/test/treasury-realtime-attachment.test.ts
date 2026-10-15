import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const page=readFileSync(new URL('../src/modules/treasury/TreasuryPage.tsx',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('../src/components/AppBootstrap.tsx',import.meta.url),'utf8');

test('le formulaire expose le rattachement, la concession et l’agence filtrée',()=>{
  assert.match(page,/Rattachement du compte/);
  assert.match(page,/a\.concessionId===accountForm\.concessionId/);
  assert.match(page,/attachment_mutable/);
});

test('les KPI sont ventilés par devise et séparent les transferts internes',()=>{
  assert.match(page,/summary\.data\?\.byCurrency/);
  assert.match(page,/Entrées externes/);
  assert.match(page,/Transferts internes/);
});

test('les événements ciblent les familles de clés RH et Trésorerie',()=>{
  assert.match(bootstrap,/treasuryEvents/);
  assert.match(bootstrap,/hrEvents/);
  assert.match(bootstrap,/queryKey:\['treasury'\]/);
  assert.match(bootstrap,/queryKey:\['hr'\]/);
  assert.match(bootstrap,/socket\.on\('connect',resynchronize\)/);
});
