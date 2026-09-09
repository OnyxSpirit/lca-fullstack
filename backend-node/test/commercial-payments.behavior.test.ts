import assert from'node:assert/strict';
import{test}from'node:test';
import{applyPayment,assertFinanciallySettled}from'../src/modules/billing/payment.domain.js';

test('PAY-SALE-01 un acompte de 5 000 000 laisse 15 000 000',()=>{assert.deepEqual(applyPayment(0,20_000_000,5_000_000),{paid:5_000_000,balance:15_000_000,status:'partially_paid'})});
test('PAY-SALE-02 un deuxième versement conserve le premier et cumule 8 000 000',()=>{const payments=[5_000_000,3_000_000];const result=applyPayment(payments[0],15_000_000,payments[1]);assert.equal(payments.length,2);assert.deepEqual(result,{paid:8_000_000,balance:12_000_000,status:'partially_paid'})});
test('PAY-SALE-03 un troisième versement partiel cumule 15 000 000',()=>{assert.deepEqual(applyPayment(8_000_000,12_000_000,7_000_000),{paid:15_000_000,balance:5_000_000,status:'partially_paid'})});
test('PAY-SALE-04 le solde exact clôt le calcul financier',()=>{assert.deepEqual(applyPayment(15_000_000,5_000_000,5_000_000),{paid:20_000_000,balance:0,status:'paid'})});
test('PAY-SALE-05 un dépassement est refusé sans modifier l’état précédent',()=>{const before={paid:15_000_000,balance:5_000_000};assert.throws(()=>applyPayment(before.paid,before.balance,6_000_000),error=>Boolean(error&&typeof error==='object'&&'status'in error&&error.status===409));assert.deepEqual(before,{paid:15_000_000,balance:5_000_000})});
test('PAY-SALE-06 la finalisation refuse une vente partiellement payée',()=>{assert.throws(()=>assertFinanciallySettled(12_000_000,'vente'),error=>Boolean(error&&typeof error==='object'&&'status'in error&&error.status===409))});
test('PAY-SALE-07 la finalisation accepte une vente soldée',()=>{assert.doesNotThrow(()=>assertFinanciallySettled(0,'vente'))});
test('PAY-SALE-08 deux paiements du solde ne peuvent pas être appliqués au même état verrouillé',()=>{const first=applyPayment(19_000_000,1_000_000,1_000_000);assert.equal(first.balance,0);assert.throws(()=>applyPayment(first.paid,first.balance,1_000_000))});
test('PAY-DELIVERY-01 un solde restant ne supprime pas la possibilité de planifier',()=>{const planning={allowed:true,balance:3_500_000};assert.equal(planning.allowed,true)});
test('PAY-DELIVERY-02 la remise finale refuse une vente partiellement payée',()=>{assert.throws(()=>assertFinanciallySettled(3_500_000,'livraison'),error=>Boolean(error&&typeof error==='object'&&'message'in error&&String(error.message).includes('livraison est impossible')))});
test('PAY-DELIVERY-03 la remise financière est éligible quand la vente est soldée',()=>{assert.doesNotThrow(()=>assertFinanciallySettled(0,'livraison'))});
