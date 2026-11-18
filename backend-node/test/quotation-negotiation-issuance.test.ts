import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const service=readFileSync(new URL('../src/modules/quotations/quotation.service.ts',import.meta.url),'utf8');
const crm=readFileSync(new URL('../../frontend/src/modules/crm/CrmPage.tsx',import.meta.url),'utf8');

test('un devis en négociation non émis reste émissible et conserve son statut',()=>{
  assert.match(service,/\['draft','negotiation'\]\.includes\(String\(quotation\.status\)\)/);
  assert.match(service,/nextStatus=quotation\.status==='draft'\?'sent':'negotiation'/);
  assert.match(crm,/!quotation\.identitySnapshot\s*&&\s*\[["']draft["'],\s*["']negotiation["']\]\.includes\(\s*quotation\.status,?\s*\)/);
});
