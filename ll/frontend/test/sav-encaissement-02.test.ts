import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
import{canCollectInvoicePayment}from'../src/modules/billing/invoicePaymentPolicy';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8'),order=read('../src/modules/service/RepairOrderDetailPage.tsx'),invoice=read('../src/modules/billing/InvoiceDetailPage.tsx'),shared=read('../src/modules/billing/InvoicePaymentComponents.tsx'),hooks=read('../src/api/erpHooks.ts');

test('SAV-ENCAISSEMENT-02 A-F applique exactement la policy centrale du bouton Encaisser',()=>{
	 const mayCollect=(status?:string)=>status?canCollectInvoicePayment(status,500_000,true):false;
	 assert.equal(mayCollect(),false);
 assert.equal(canCollectInvoicePayment('BROUILLON',500_000,true),false);
 assert.equal(canCollectInvoicePayment('VALIDEE',500_000,true),true);
 assert.equal(canCollectInvoicePayment('PARTIELLEMENT_PAYEE',350_000,true),true);
 assert.equal(canCollectInvoicePayment('PAYEE',0,true),false);
 assert.equal(canCollectInvoicePayment('VALIDEE',500_000,false),false);
});

test('SAV-ENCAISSEMENT-02 partage formulaire, historique et reçu central entre Facturation et OR',()=>{
 for(const page of[invoice,order]){assert.match(page,/InvoicePaymentForm/);assert.match(page,/InvoicePaymentHistory/)}
	 assert.match(shared,/useInvoicePayment\(\)/);assert.match(shared,/usePaymentMethodsQuery\(canCollect\)/);assert.match(shared,/\/payments\/\$\{payment\.id\}\/receipt/);
	 assert.match(order,/can\('billing\.invoice\.view'\)/);assert.match(order,/can\('billing\.payment\.view'\)/);assert.match(order,/can\('billing\.payment\.collect'\)/);
	 assert.match(order,/\(canViewPayments\|\|canCollectPayment\).*Encaissé/s);
 assert.doesNotMatch(order,/COMPTABLE|CONSEILLER_SAV|role ===|roles\.includes/);
});

test('SAV-ENCAISSEMENT-02 pending, erreur et reconstruction restent pilotés par mutation et serveur',()=>{
 assert.match(shared,/if\(payment\.isPending\)return/);assert.match(shared,/disabled=\{payment\.isPending\}/);assert.match(shared,/Encaissement impossible/);
 assert.match(hooks,/qc\.invalidateQueries\(\{queryKey:erpKeys\.repairOrders\}\)/);assert.match(order,/useRepairDetailQuery\(id\)/);assert.match(order,/useInvoicePaymentsQuery/);
});

test('SAV-ENCAISSEMENT-02 conserve Facturation avant Situation financière puis Remise',()=>{
 const positions=['<CardTitle>Facturation</CardTitle>','<CardTitle>Situation financière</CardTitle>','Remise / clôture'].map(value=>order.indexOf(value));
 assert.ok(positions.every(value=>value>=0));assert.deepEqual([...positions].sort((a,b)=>a-b),positions);
});
