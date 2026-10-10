import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {salePaymentLabel} from '../src/modules/sales/salePaymentLabel.js';

test('VENTE-UI-01A sans paiement ne présente pas la vente comme soldée',()=>{
  assert.equal(salePaymentLabel(0,33_000_000),null);
});

test('VENTE-UI-01B un paiement partiel reste un acompte',()=>{
  assert.equal(salePaymentLabel(10_000_000,23_000_000),'Acompte');
});

test('VENTE-UI-01C/01E un paiement intégral en une fois est soldé',()=>{
  assert.equal(salePaymentLabel(33_000_000,0),'Soldé');
});

test('VENTE-UI-01D le cumul intégral de plusieurs paiements est soldé',()=>{
  assert.equal(salePaymentLabel(33_000_000,0),'Soldé');
});

test('un montant encaissé supérieur ne revient jamais à acompte',()=>{
  assert.equal(salePaymentLabel(33_000_001,-1),'Soldé');
});

test('VENTE-UI-01F suit le solde autoritaire après remboursement ou avoir',()=>{
  assert.equal(salePaymentLabel(20_000_000,13_000_000),'Acompte');
  assert.equal(salePaymentLabel(0,33_000_000),null);
});

test('le tableau Vente utilise le libellé financier calculé',()=>{
  const source=readFileSync(new URL('../src/modules/sales/SalesListPage.tsx',import.meta.url),'utf8');
  assert.match(source,/salePaymentLabel\(sale\.depositPaidTTC,sale\.remainingBalanceTTC\)/);
  assert.doesNotMatch(source,/>Acompte: \{formatCurrency\(sale\.depositPaidTTC\)\}/);
});
