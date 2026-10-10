import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const route=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8'),credit=route.slice(route.indexOf("post('/invoices/:id/credit-notes'"),route.indexOf("post('/payments/:id/refund'"));

test('CN-UX-11/12 refuse le dépassement et accepte la borne exacte',()=>{
 assert.match(credit,/if\(amount>remaining\+\.001\)throw new HttpError\(409,'Avoir supérieur au montant disponible'\)/);
 assert.doesNotMatch(credit,/Math\.min\(amount|amount=Math\.min/);
});

test('CN-UX-13..16 recalcule le reliquat sous verrou transactionnel',()=>{
 assert.match(credit,/transaction\(async c=>/);
 assert.match(credit,/access\(invoiceId,r,'billing\.invoice\.cancel',c,true\)/);
 assert.match(credit,/SUM\(amount\).*status IN\("issued","applied"\)/);
 assert.match(credit,/remaining=Number\(invoice\.total\)-Number\(credits\[0\]\?\.amount\?\?0\)/);
});

test('CN-UX-18..20 ne modifie ni remboursement, ni Vente, ni calcul financier',()=>{
 assert.doesNotMatch(credit,/payment_refunds|UPDATE sales|UPDATE vehicles/);
 assert.match(credit,/recalc\(c,invoiceId\)/);
});
