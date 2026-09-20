import assert from 'node:assert/strict';
import {test} from 'node:test';
import {reportCsv} from '../src/modules/reports/report.csv.js';

test('REP-CSV-01 à 06 : CSV français, UTF-8, décimales et texte dangereux',()=>{
  const csv=reportCsv('sales',{sales_count:2,revenue:25000000.5,margin:-1200},'2026-09-01','2026-09-30','=Agence; "X"\nSuite');
  assert.ok(csv.startsWith('\ufeff"Période du";"Période au";"Agence";"Indicateur";"Valeur"\r\n'));
  assert.match(csv,/"01\/09\/2026";"30\/09\/2026"/);
  assert.match(csv,/"Montant des ventes TTC";"25000000,5"/);
  assert.match(csv,/"Marge brute véhicules";"-1200"/);
  assert.match(csv,/"'=Agence; ""X""\nSuite"/);
  assert.equal(csv.split('"Nombre de ventes"').length,2);
  assert.ok(csv.endsWith('\r\n'));
});
test('REP-CSV stock : le relevé courant n’est pas présenté comme un historique filtré',()=>{
  const csv=reportCsv('vehicles',{stock_count:2,stock_value:8_000_000},'2025-01-01','2025-12-31','Agence A');
  assert.match(csv,/^\ufeff"Date du relevé";"Agence";"Indicateur";"Valeur"/);
  assert.doesNotMatch(csv,/2025/);
});
