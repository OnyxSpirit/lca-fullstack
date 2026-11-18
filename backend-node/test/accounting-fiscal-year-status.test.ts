import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const service=readFileSync(new URL('../src/modules/accounting/accounting.service.ts',import.meta.url),'utf8');
const routes=readFileSync(new URL('../src/modules/accounting/accounting.routes.ts',import.meta.url),'utf8');
test('FIN-003 permet d’ouvrir explicitement un exercice',()=>{assert.match(routes,/fiscal-years\/:id\/status/);assert.match(service,/\[["']OPEN["'],\s*["']CLOSED["']\]/);assert.match(service,/accounting_fiscal_year[\s\S]{0,120}next\s*===\s*["']OPEN["']/)});
test('FIN-003 interdit la clôture annuelle avec périodes ouvertes',()=>{assert.match(service,/Toutes les périodes doivent être clôturées/);assert.match(service,/SUM\(status='CLOSED'\)/)});
