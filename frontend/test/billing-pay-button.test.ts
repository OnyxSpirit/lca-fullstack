import assert from 'node:assert/strict';
import {test} from 'node:test';
import {canCollectInvoicePayment} from '../src/modules/billing/invoicePaymentPolicy';
import {invoiceStatusFromDb} from '../src/services/mysqlStatusMap';

test('BILL-PAY-BUTTON-01 brouillon : Encaisser absent',()=>{
  assert.equal(canCollectInvoicePayment(invoiceStatusFromDb.draft,100,true),false);
});

test('BILL-PAY-BUTTON-02 issued devient VALIDEE et permet l’encaissement',()=>{
  assert.equal(invoiceStatusFromDb.issued,'VALIDEE');
  assert.equal(canCollectInvoicePayment(invoiceStatusFromDb.issued,100,true),true);
});

test('BILL-PAY-BUTTON-03 paiement partiel : Encaisser reste visible',()=>{
  assert.equal(canCollectInvoicePayment('PARTIELLEMENT_PAYEE',60,true),true);
});

test('BILL-PAY-BUTTON-04 facture en retard : Encaisser visible',()=>{
  assert.equal(canCollectInvoicePayment('EN_RETARD',100,true),true);
});

test('BILL-PAY-BUTTON-05 facture payée : Encaisser absent',()=>{
  assert.equal(canCollectInvoicePayment('PAYEE',0,true),false);
});

test('BILL-PAY-BUTTON-06 facture annulée : Encaisser absent',()=>{
  assert.equal(canCollectInvoicePayment('ANNULEE',100,true),false);
});

test('BILL-PAY-BUTTON-07 permission de collecte obligatoire',()=>{
  assert.equal(canCollectInvoicePayment('VALIDEE',100,false),false);
});

test('BILL-PAY-BUTTON-08 après encaissement partiel, le solde baisse et Encaisser reste disponible',()=>{
  const total=100,amountPaid=40,balanceDue=total-amountPaid,status='PARTIELLEMENT_PAYEE';
  assert.equal(amountPaid,40);
  assert.equal(balanceDue,60);
  assert.equal(canCollectInvoicePayment(status,balanceDue,true),true);
});

test('BILL-PAY-BUTTON-09 après le dernier paiement, le solde est nul et Encaisser disparaît',()=>{
  const total=100,amountPaid=100,balanceDue=total-amountPaid,status='PAYEE';
  assert.equal(amountPaid,100);
  assert.equal(balanceDue,0);
  assert.equal(canCollectInvoicePayment(status,balanceDue,true),false);
});
