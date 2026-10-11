import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const workshop=readFileSync(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');
const layout=readFileSync(new URL('../src/modules/documents/document-layout.ts',import.meta.url),'utf8');

test('ERP-08 facture atelier persiste le régime et le taux de TVA',()=>{
  assert.match(workshop,/tax_mode,price_input_mode,tax_rate_snapshot,created_by/);
  assert.match(workshop,/'TAXABLE','HT',\?,\?\)/);
  assert.match(workshop,/businessConfig\.currencyCode,businessConfig\.vatRate,r\.user!\.sub/);
});

test('ERP-08 pied de page reste dans la zone imprimable A4',()=>{
  assert.match(layout,/lines\.contact,42,766/);
  assert.match(layout,/`Page \$\{index\+1\} \/ \$\{range\.count\}`,42,779/);
  assert.doesNotMatch(layout,/,42,792/);
});
