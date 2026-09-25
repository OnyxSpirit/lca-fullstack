import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const page=readFileSync(new URL('../src/modules/sales/SaleDetailPage.tsx',import.meta.url),'utf8');

test('FIN-UX-01 ordered vers confirmed affiche Confirmer la vente',()=>{assert.match(page,/FINANCEMENT_VALIDE: 'Confirmer la vente'/);assert.doesNotMatch(page,/FINANCEMENT_VALIDE: 'Valider le financement'/)});
test('FIN-UX-02 preparation et pret a livrer utilisent la meme garde financiere',()=>{assert.match(page,/next==='PREPARATION'\|\|next==='PRET_LIVRAISON'/);assert.match(page,/isFinancialTransition&&!sale\.financiallyCleared/)});
test('FIN-UX-03 le bouton est desactive et explique le solde',()=>{assert.match(page,/disabled=\{financialBlocked\}/);assert.match(page,/Préparation impossible — solde restant/)});
