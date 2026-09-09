import assert from'node:assert/strict';
import{test}from'node:test';
import{applyPayment}from'../src/modules/billing/payment.domain.js';

test('PAY-01 un acompte de 2 000 000 laisse 8 000 000',()=>{assert.deepEqual(applyPayment(0,10_000_000,2_000_000),{paid:2_000_000,balance:8_000_000,status:'partially_paid'})});
test('PAY-02 un deuxième versement crée un cumul de 5 000 000 sans remplacer le premier',()=>{assert.deepEqual(applyPayment(2_000_000,8_000_000,3_000_000),{paid:5_000_000,balance:5_000_000,status:'partially_paid'})});
test('PAY-03 le versement exact solde la facture',()=>{assert.deepEqual(applyPayment(5_000_000,5_000_000,5_000_000),{paid:10_000_000,balance:0,status:'paid'})});
test('PAY-04 un dépassement est refusé avec le montant explicite',()=>{assert.throws(()=>applyPayment(9_000_000,1_000_000,1_500_000),error=>Boolean(error&&typeof error==='object'&&'status'in error&&error.status===409&&'message'in error&&String(error.message).includes('500000 XAF')))});
test('PAY-05 après le premier règlement soldant, une seconde application ne peut produire de dépassement',()=>{const first=applyPayment(9_000_000,1_000_000,1_000_000);assert.equal(first.balance,0);assert.throws(()=>applyPayment(first.paid,first.balance,1_000_000))});
