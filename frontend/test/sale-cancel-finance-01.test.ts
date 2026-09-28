import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const page=readFileSync(new URL('../src/modules/sales/SaleDetailPage.tsx',import.meta.url),'utf8');

test('SCF-08 affiche un blocage métier exploitable pour un encaissement net',()=>{
 assert.match(page,/financialRegularizationRequired=netCollected>0/);
 assert.match(page,/Régularisation financière requise/);
 assert.match(page,/ne peut pas être annulée tant que les sommes encaissées n’ont pas été remboursées/);
 assert.match(page,/Encaissement net/);assert.match(page,/Reste à régulariser/);
});

test('SCF-09 oriente vers la facture sans dupliquer avoir et remboursement',()=>{
 assert.match(page,/canViewInvoice&&invoice&&<Button[^>]*onClick=\{\(\)=>navigate\(`\/billing\/\$\{invoice\.id\}`\)\}>Accéder à la facture/);
 assert.doesNotMatch(page,/credit-notes|payments\/.*refund/);
});

test('SCF-14/15/21 repose sur les données serveur et exige une nouvelle annulation',()=>{
 assert.match(page,/const invoiceQuery=useInvoiceQuery\(sale\?\.invoiceId,agencyId,canViewInvoice\),invoice=invoiceQuery\.data/);
 assert.match(page,/Revenir sur cette vente et relancer l’annulation/);
 assert.doesNotMatch(page,/localStorage|sessionStorage|vehicle.*available/si);
});

test('SCF-04/22/23 présente le verrou sans exception de rôle ou permission',()=>{
 assert.match(page,/disabled=\{cancellationBlocked\}/);
 assert.match(page,/cancellationBlocked=financialRegularizationRequired\|\|/);
 assert.doesNotMatch(page,/SUPER_ADMIN|isSuperAdmin/);
});
