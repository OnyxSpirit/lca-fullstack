import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {applyPayment} from '../src/modules/billing/payment.domain.js';
import {renderPaymentReceiptData} from '../src/modules/documents/commercial-document.js';
import {formatDocumentAmount} from '../src/modules/documents/document-money.js';

const identity=(logos:string[])=>({legalName:'LCA Concession',tradeName:'LCA Concession',agencyName:'Agence Brazzaville',agencyAddress:'Avenue de la Concession',agencyCity:'Brazzaville',phone:'+242 00 000 00 00',email:'contact@lca.local',taxIdentifier:'NIU-LCA',currencyCode:'XAF',logoCandidates:logos});
const payment=(number:string,amount:number)=>({agency_id:1,payment_number:number,payment_date:'2026-09-16 10:00',invoice_number:'FAC-2026-001',customer_name:'Client Démonstration',amount,currency_code:'XAF',payment_method:'Virement',reference:`VIR-${number}`,received_by_name:'Caissier Exemple'});
const testLogo=async()=>readFile(new URL('../../frontend/public/images/logo-lca2.png',import.meta.url)).then(value=>value.toString('base64'));

test('RECU-01 les paiements partiels et finaux restent des reçus distincts',async()=>{
 const first=applyPayment(0,35_000_000,10_000_000);
 assert.deepEqual(first,{paid:10_000_000,balance:25_000_000,status:'partially_paid'});
 const final=applyPayment(first.paid,first.balance,25_000_000);
 assert.deepEqual(final,{paid:35_000_000,balance:0,status:'paid'});
 assert.equal(formatDocumentAmount(10_000_000,'XAF'),'10.000.000 XAF');
 assert.equal(formatDocumentAmount(25_000_000,'XAF'),'25.000.000 XAF');
 const logo=await testLogo();
 const firstPdf=await renderPaymentReceiptData(payment('REG-001',10_000_000),identity([logo]));
 const finalPdf=await renderPaymentReceiptData(payment('REG-002',25_000_000),identity([logo]));
 for(const pdf of [firstPdf,finalPdf]){assert.equal(pdf.subarray(0,4).toString(),'%PDF');assert.ok(pdf.length>10_000)}
 assert.notDeepEqual(firstPdf,finalPdf);
});

test('RECU-02 logo invalide puis configuré, et génération sans logo',async()=>{
 const logo=await testLogo();
 for(const logos of [['logo-invalide',logo],[]]){
  const pdf=await renderPaymentReceiptData(payment('REG-003',5_000_000),identity(logos));
  assert.equal(pdf.subarray(0,4).toString(),'%PDF');
 }
});
