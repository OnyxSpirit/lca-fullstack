import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const detail=read('../src/modules/billing/InvoiceDetailPage.tsx'),payments=read('../src/modules/billing/InvoicePaymentComponents.tsx'),hooks=read('../src/api/erpHooks.ts'),sale=read('../src/modules/sales/SaleDetailPage.tsx'),sav=read('../src/modules/service/RepairOrderDetailPage.tsx');
test('AR-FE-01 remboursement conditionnel avec formulaire complet',()=>{for(const value of['Avoir justificatif','Montant à rembourser','Reliquat remboursable','Motif','Confirmer le remboursement'])assert.match(detail,new RegExp(value));assert.match(payments,/canRefund&&item\.refundableRemaining>0/);assert.match(detail,/billing\.payment\.refund/)});
test('AR-FE-02 bornes paiement et avoir, idempotence et pending',()=>{assert.match(detail,/Math\.min\(refundPayment\?\.refundableRemaining/);assert.match(detail,/Number\(refundForm\.amount\)<=0/);assert.match(detail,/idempotencyKey:refundKey/);assert.match(detail,/if\(!refundPayment\|\|pending\)return/)});
test('AR-FE-03 historique partiel et total',()=>{assert.match(payments,/Remboursé/);assert.match(hooks,/effective_status/);assert.match(hooks,/refundedAmount/);assert.match(detail,/montant.*utilisé.*disponible/is)});
test('AR-FE-04 navigation centrale Vente et SAV conservée',()=>{assert.match(sale,/navigate\(`\/billing\/\$\{sale\.invoiceId\}`\)/);assert.match(sav,/detailRoutes\.invoice\(ro\.invoice!\.id\)/)});
