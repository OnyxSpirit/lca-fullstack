import test from 'node:test';
import assert from 'node:assert/strict';
import { financialCsv, reportCsv } from '../src/modules/reports/report.csv.ts';
import { billingOperationsCsv } from '../src/modules/billing/billing-export.csv.ts';

test('financialCsv produit un CSV français UTF-8 sûr sans altérer les nombres négatifs', () => {
  const csv = financialCsv([
    ['Libellé', 'Montant', 'Devise'],
    ['=2+2', -1250.5, 'XAF'],
    [' +cmd', 42, '@attaque'],
    ['-formule', 0, 'Texte; avec "guillemets" et accents éè'],
  ]);
  assert.ok(csv.startsWith('\ufeff'));
  assert.match(csv, /"'=2\+2";"-1250\.5";"XAF"/);
  assert.match(csv, /"' \+cmd";"42";"'@attaque"/);
  assert.match(csv, /"'-formule";"0";"Texte; avec ""guillemets"" et accents éè"/);
  assert.ok(csv.endsWith('\r\n'));
});

test('les exports de reporting et facturation restent francisés et protégés', () => {
  const report = reportCsv('finance', { gross: 1000, net: 900, collected: 500, outstanding: 400, overdue_amount: 50, invoices_count: 2 }, '2026-01-01', '2026-01-31', '=Agence');
  assert.match(report, /Facturation brute TTC/);
  assert.match(report, /"'=Agence"/);
  const billing = billingOperationsCsv({ currencyCode: 'XAF', invoices: [{ invoice_number: '=FAC', issue_date: '2026-01-10', customer_name: '@Client', total: 1000, tax_total: 0, status: 'issued' }], payments: [], legacyRefunds: [], refunds: [], credits: [] });
  assert.match(billing, /Montant facturé XAF/);
  assert.match(billing, /"'=FAC"/);
  assert.match(billing, /"'@Client"/);
  assert.match(billing, /"Émise"/);
});
