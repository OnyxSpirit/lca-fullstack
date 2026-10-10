import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
import{creditNoteMaximum,isCreditNoteAmountValid}from'../src/modules/billing/creditNoteValidation';

const page=readFileSync(new URL('../src/modules/billing/InvoiceDetailPage.tsx',import.meta.url),'utf8');

test('CN-UX-01..03 accepte les montants bornés et refuse le dépassement',()=>{
 assert.equal(isCreditNoteAmountValid('10000000',20000000),true);
 assert.equal(isCreditNoteAmountValid('20000000',20000000),true);
 assert.equal(isCreditNoteAmountValid('20000001',20000000),false);
});

test('CN-UX-04..10 conserve la saisie, explique la borne et bloque uniquement l’invalide',()=>{
 assert.match(page,/value=\{form\.amount\}/);
 assert.match(page,/onChange=\{event=>setForm\(\{\.\.\.form,amount:event\.target\.value\}\)\}/);
 assert.doesNotMatch(page,/setForm\([^\n]*Math\.min/);
 assert.match(page,/Maximum autorisé : \{formatCurrency\(maximumCreditAmount\)\}/);
 assert.match(page,/Le montant saisi dépasse le montant maximum autorisé/);
 assert.match(page,/disabled=\{modal==='credit'&&!creditAmountValid\}/);
});

test('CN-UX-13..15 réutilise le reliquat et autorise plusieurs avoirs partiels',()=>{
 const notes:any[]=[{amount:5000000,status:'applied'},{amount:2000000,status:'cancelled'}];
 assert.equal(creditNoteMaximum(20000000,notes),15000000);
 assert.equal(isCreditNoteAmountValid('10000000',creditNoteMaximum(20000000,notes)),true);
 assert.match(page,/invoice\.status!=='ANNULEE'.*Créer avoir/);
});

test('CN-UX-17 ne valide jamais une valeur vide, non numérique, nulle ou négative',()=>{
 for(const value of['','abc','0','-1'])assert.equal(isCreditNoteAmountValid(value,20000000),false);
 assert.match(page,/if\(modal==='credit'&&!creditAmountValid\)return/);
});
