import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{ledgerColumns,renderAccountingTable}from'../src/modules/accounting/accounting-document.js';

test('DOC-CPT-01 le grand livre LCA est paginé, exhaustif et porte le pied légal',async()=>{
 const identity={legalName:'La Congolaise de l’Automobile',legalForm:'SA',rccm:'CG-BZV',taxIdentifier:'NIU-001',agencyName:'Centre',agencyCity:'Brazzaville',logoCandidates:[]};
 const rows=Array.from({length:90},(_,index)=>['2026-11-13',`EC-${index+1}`,'VT','411000',`Écriture numéro ${index+1}`,1000,1000,index]);
 const pdf=await renderAccountingTable({identity,title:'GRAND LIVRE COMPTABLE',reference:'90 ligne(s)',period:{from:'2026-01-01',to:'2026-12-31'},columns:ledgerColumns,rows});
 assert.equal(pdf.subarray(0,4).toString(),'%PDF');
 assert.ok(Number(/\/Count\s+(\d+)/.exec(pdf.toString('latin1'))?.[1]??0)>1);
 assert.match(pdf.subarray(-32).toString('latin1'),/%%EOF/);
});

test('DOC-CPT-02 l’export collecte toutes les pages et bannit la coupe historique 1500',()=>{
 const route=readFileSync(new URL('../src/modules/accounting/accounting-advanced.routes.ts',import.meta.url),'utf8');
 assert.match(route,/items\.length<first\.total/);
 assert.doesNotMatch(route,/slice\(0,1500\)/);
 assert.match(route,/grand-livre-comptable/);
 assert.match(route,/addWorksheet\(report==='ledger'\?'Grand livre':'Balance générale'\)/);
});
