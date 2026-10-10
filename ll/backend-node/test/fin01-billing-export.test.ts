import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{billingOperationsCsv}from'../src/modules/billing/billing-export.csv.js';
import{financialCsv}from'../src/modules/reports/report.csv.js';

const route=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8');
const agencyScope=readFileSync(new URL('../src/middleware/agency-scope.ts',import.meta.url),'utf8');

test('FIN-01 CSV neutralise les formules textuelles et conserve les nombres',()=>{
 const csv=financialCsv([['Valeur','Montant'],['=1+1',1],['+SOMME(1;2)',-12.5],['-1+2',0],['@TEST',2],['  =1+1',3],['\t=1+1',4],['\n=1+1',5],['Été; "Congo"',6],['',7]]);
 for(const dangerous of["'=1+1","'+SOMME(1;2)","'-1+2","'@TEST","'  =1+1","'\t=1+1","'\n=1+1"])assert.ok(csv.includes(dangerous),dangerous);
 assert.match(csv,/"Été; ""Congo"""/);assert.match(csv,/;"-12\.5"\r\n/);assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.endsWith('\r\n'));
});

test('FIN-01 export distingue facture, encaissement, remboursement et avoir en français',()=>{
 const csv=billingOperationsCsv({currencyCode:'XAF',invoices:[{invoice_number:'FAC-1',issue_date:'2026-10-01',customer_name:'Client',total:25_000_000,tax_total:0,status:'issued'}],payments:[{payment_number:'REG-1',payment_date:'2026-10-02',invoice_number:'FAC-1',amount:10_000_000,payment_method:'Espèces'}],legacyRefunds:[],refunds:[{refund_number:'REM-1',refunded_at:'2026-10-03',invoice_number:'FAC-1',amount:1_000_000,payment_method:'Espèces',is_reversed:0}],credits:[{credit_note_number:'AVO-1',issue_date:'2026-10-03',invoice_number:'FAC-1',amount:2_000_000,status:'applied'}]});
 assert.match(csv,/Montant facturé XAF/);assert.match(csv,/Montant encaissé XAF/);assert.match(csv,/Montant remboursé XAF/);assert.match(csv,/Montant avoir XAF/);
 assert.match(csv,/"25000000";"0";"0";"0"/);assert.match(csv,/"0";"10000000";"0";"0"/);assert.match(csv,/"0";"0";"1000000";"0"/);assert.match(csv,/"0";"0";"0";"2000000"/);
 assert.match(csv,/"Émise"/);assert.match(csv,/"Confirmé"/);assert.match(csv,/"Remboursé"/);assert.match(csv,/"Appliqué"/);
});

test('FIN-01 conserve deux remboursements modernes distincts, même de même montant',()=>{
 const csv=billingOperationsCsv({currencyCode:'XAF',invoices:[],payments:[],legacyRefunds:[],refunds:[{refund_number:'REM-41',amount:5000},{refund_number:'REM-42',amount:5000}],credits:[]});
 assert.equal((csv.match(/"Remboursement"/g)??[]).length,2);assert.match(csv,/REM-41/);assert.match(csv,/REM-42/);
});

test('FIN-01 expose une contrepassation sans supprimer l’événement historique',()=>{
 const csv=billingOperationsCsv({currencyCode:'XAF',invoices:[],payments:[],legacyRefunds:[],refunds:[{refund_number:'REM-7',amount:5000,is_reversed:1}],credits:[]});
 assert.match(csv,/REM-7/);assert.match(csv,/Contrepassé/);
});

test('FIN-01 déduplique legacy par relation au paiement et filtre les paiements non encaissés',()=>{
 assert.match(route,/p\.status IN\('confirmed','refunded'\)/);
 assert.match(route,/p\.status='refunded' AND NOT EXISTS\(SELECT 1 FROM payment_refunds dedupe WHERE dedupe\.payment_id=p\.id\)/);
 assert.match(route,/FROM payment_refunds pr JOIN payments p ON p\.id=pr\.payment_id/);
 assert.match(route,/filename="operations-facturation\.csv"/);
 assert.match(route,/const exportAgencyId=await billingExportAgency\(r\),scoped=\{sql:'i\.agency_id=\?',params:\[exportAgencyId\]\}/);
 assert.match(route,/scope==='AGENCY'&&requested!==actorAgency/);
 assert.match(route,/JOIN agencies actor ON actor\.concession_id=target\.concession_id/);
 assert.match(agencyScope,/request\.path==='\/invoices\/export\/accounting'/);
});

test('FIN-01 export vide conserve uniquement un en-tête français stable',()=>{
 const csv=billingOperationsCsv({currencyCode:'XAF',invoices:[],payments:[],legacyRefunds:[],refunds:[],credits:[]});
 assert.equal(csv.split('\r\n').filter(Boolean).length,1);assert.doesNotMatch(csv,/Journal|Debit|Credit|refunded|confirmed/);
});
