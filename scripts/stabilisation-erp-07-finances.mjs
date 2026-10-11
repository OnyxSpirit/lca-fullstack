import {mkdir,writeFile} from 'node:fs/promises';

const base=process.env.RECETTE_API_URL??'http://127.0.0.1:3004/api';
const adminEmail=process.env.ADMIN_EMAIL,adminPassword=process.env.ADMIN_PASSWORD,userPassword=process.env.RECETTE_USER_PASSWORD;
if(!adminEmail||!adminPassword||!userPassword)throw new Error('Variables de recette manquantes');
const timings=[],checks=[];
async function call(path,{method='GET',token,body,expected=[200],binary=false}={}){
  const start=performance.now(),response=await fetch(base+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  timings.push({method,path,status:response.status,ms:Math.round((performance.now()-start)*100)/100});
  if(binary){const data=Buffer.from(await response.arrayBuffer());if(!expected.includes(response.status))throw new Error(`${method} ${path}: ${response.status}`);return{status:response.status,data,headers:Object.fromEntries(response.headers)}}
  const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null}catch{data={raw:raw.slice(0,300)}}
  if(!expected.includes(response.status))throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return{status:response.status,data};
}
const login=async(email,password=userPassword)=>(await call('/auth/login',{method:'POST',body:{email,password}})).data.accessToken;
const token={admin:await login(adminEmail,adminPassword),finance:await login('recette.responsable_financier@lca-test.cg'),accountant:await login('recette.comptable@lca-test.cg'),commercial:await login('recette.commercial@lca-test.cg'),direction:await login('recette.direction@lca-test.cg'),delivery:await login('recette.responsable_livraison@lca-test.cg')};
const finance3Email='recette.finance.agence3@lca-test.cg';
let finance3=(await call('/users',{token:token.admin})).data.find(x=>x.email===finance3Email);
if(!finance3)finance3=(await call('/users',{method:'POST',token:token.admin,body:{firstName:'Recette',lastName:'Finance Agence 3',email:finance3Email,password:userPassword,jobTitle:'Finance recette ERP-07',agencyId:'3',roleCode:'RESPONSABLE_FINANCIER'},expected:[201]})).data;
token.finance3=await login(finance3Email);
const today=new Date().toISOString().slice(0,10),due=new Date(Date.now()+30*86400000).toISOString().slice(0,10);
const item=(description='Prestation de validation financière REC07',unitPrice=1000000)=>[{description,quantity:1,unitPrice,discount:0}];
const invoiceBody=(suffix,extra={})=>({agencyId:'2',customerId:'2',invoiceType:'manual',issueDate:today,dueDate:due,taxMode:'TAXABLE',priceInputMode:'HT',items:item(),notes:`STABILISATION-ERP-07 ${suffix}`,idempotencyKey:`REC07-INVOICE-${suffix}`,...extra});
const asItems=x=>Array.isArray(x)?x:x.items;

checks.push(['unauthenticated-list',(await call('/invoices',{expected:[401]})).status===401]);
checks.push(['invalid-id',(await call('/invoices/not-an-id',{token:token.finance,expected:[400]})).status===400]);
checks.push(['missing-invoice-key',(await call('/invoices',{method:'POST',token:token.finance,body:{...invoiceBody('MISSING-KEY'),idempotencyKey:''},expected:[400]})).status===400]);
checks.push(['invalid-due-date',(await call('/invoices',{method:'POST',token:token.finance,body:{...invoiceBody('BAD-DATE'),dueDate:'2026-01-01'},expected:[400]})).status===400]);
checks.push(['zero-line',(await call('/invoices',{method:'POST',token:token.finance,body:{...invoiceBody('ZERO-V2'),items:item('Ligne nulle',0)},expected:[400]})).status===400]);
checks.push(['cross-agency-customer',(await call('/invoices',{method:'POST',token:token.finance,body:{...invoiceBody('CROSS'),customerId:'1'},expected:[403]})).status===403]);
checks.push(['existing-sale-invoice',(await call('/invoices',{method:'POST',token:token.finance,body:{...invoiceBody('DUP-SALE'),invoiceType:'vehicle',saleId:'2',items:item('Vente 2',16943250)},expected:[409]})).status===409]);
checks.push(['cancelled-sale-invoice',(await call('/invoices',{method:'POST',token:token.finance3,body:{...invoiceBody('CANCELLED-SALE'),agencyId:'3',customerId:'1',invoiceType:'vehicle',saleId:'4',items:item('Vente annulée',34481000)},expected:[409]})).status===409]);

let list=(await call('/invoices?page=1&pageSize=100',{token:token.finance})).data;
const zeroLeak=asItems(list).find(x=>x.notes==='STABILISATION-ERP-07 ZERO'&&x.status!=='cancelled');
if(zeroLeak)await call(`/invoices/${zeroLeak.id}/cancel`,{method:'POST',token:token.finance,body:{reason:'Nettoyage de la donnée nulle révélée puis corrigée par ERP-07'}});
let concurrencyProbe=asItems(list).find(x=>x.notes==='STABILISATION-ERP-07 CONCURRENCY-V2');
if(!concurrencyProbe){
  const probe=await Promise.all([call('/invoices',{method:'POST',token:token.finance,body:invoiceBody('CONCURRENCY-V2',{items:item('Sonde concurrence REC07',10000)}),expected:[200,201]}),call('/invoices',{method:'POST',token:token.finance,body:invoiceBody('CONCURRENCY-V2',{items:item('Sonde concurrence REC07',10000)}),expected:[200,201]})]);
  checks.push(['concurrent-idempotent-invoice',probe.map(x=>x.status).sort().join(',')==='200,201']);
  concurrencyProbe=(await call(`/invoices/${probe[0].data.id}`,{token:token.finance})).data;
}else checks.push(['concurrent-idempotent-invoice',true]);
if(concurrencyProbe.status!=='cancelled')await call(`/invoices/${concurrencyProbe.id}/cancel`,{method:'POST',token:token.finance,body:{reason:'Fin de la sonde de concurrence REC07'}});
let main=asItems(list).find(x=>x.notes==='STABILISATION-ERP-07 MAIN-V2');
let createStatuses=[];
if(!main){
  const created=await Promise.all([call('/invoices',{method:'POST',token:token.finance,body:invoiceBody('MAIN-V2'),expected:[200,201]}),call('/invoices',{method:'POST',token:token.finance,body:invoiceBody('MAIN-V2'),expected:[200,201]})]);
  createStatuses=created.map(x=>x.status).sort();
  main=(await call(`/invoices/${created[0].data.id}`,{token:token.finance})).data;
}else main=(await call(`/invoices/${main.id}`,{token:token.finance})).data;
if(createStatuses.length)checks.push(['main-idempotent-create',createStatuses.join(',')==='200,201']);
if(main.status==='draft'){
  checks.push(['draft-bad-update',(await call(`/invoices/${main.id}`,{method:'PATCH',token:token.finance,body:{issueDate:today,dueDate:'2026-01-01',items:item()},expected:[400]})).status===400]);
  await call(`/invoices/${main.id}`,{method:'PATCH',token:token.finance,body:{issueDate:today,dueDate:due,items:item(),notes:'STABILISATION-ERP-07 MAIN-V2'}});
  const issued=await Promise.all([call(`/invoices/${main.id}/status`,{method:'PATCH',token:token.finance,body:{status:'issued'}}),call(`/invoices/${main.id}/status`,{method:'PATCH',token:token.finance,body:{status:'issued'}})]);
  checks.push(['concurrent-idempotent-issue',issued.every(x=>x.status===200)]);
}
main=(await call(`/invoices/${main.id}`,{token:token.finance})).data;
checks.push(['main-total',Number(main.total)===1189000&&Number(main.tax_total)===189000]);
checks.push(['issued-update-blocked',(await call(`/invoices/${main.id}`,{method:'PATCH',token:token.finance,body:{issueDate:today,dueDate:due,items:item()},expected:[409]})).status===409]);
const methods=(await call('/invoices/payment-methods',{token:token.finance})).data,cash=methods.find(x=>x.code==='CASH'),card=methods.find(x=>x.code==='CARD');
let payments=(await call(`/invoices/${main.id}/payments`,{token:token.finance})).data;
let partial=payments.find(x=>x.idempotency_key==='REC07-PAY-PARTIAL-V2');
if(!partial){
  checks.push(['payment-reference-required',(await call(`/invoices/${main.id}/payments`,{method:'POST',token:token.finance,body:{paymentMethodId:String(card.id),amount:1,idempotencyKey:'REC07-NOREF-V2'},expected:[400]})).status===400]);
  partial=(await call(`/invoices/${main.id}/payments`,{method:'POST',token:token.finance,body:{paymentMethodId:String(cash.id),amount:189000,paymentDate:today,notes:'Acompte REC07',idempotencyKey:'REC07-PAY-PARTIAL-V2'},expected:[201]})).data;
}else checks.push(['payment-reference-required',true]);
main=(await call(`/invoices/${main.id}`,{token:token.finance})).data;
checks.push(['partial-payment',Number(partial.amount??189000)===189000]);
if(main.status==='partially_paid')checks.push(['overpayment-refused',(await call(`/invoices/${main.id}/payments`,{method:'POST',token:token.finance,body:{paymentMethodId:String(cash.id),amount:Number(main.balance_due)+1,idempotencyKey:'REC07-OVERPAY-V2'},expected:[409]})).status===409]);
else checks.push(['overpayment-refused',true]);
payments=(await call(`/invoices/${main.id}/payments`,{token:token.finance})).data;
let finalPayment=payments.find(x=>x.idempotency_key==='REC07-PAY-FINAL-A-V2'||x.idempotency_key==='REC07-PAY-FINAL-B-V2');
let concurrentPaymentStatuses=[];
if(!finalPayment){
  const paid=await Promise.all([call(`/invoices/${main.id}/payments`,{method:'POST',token:token.finance,body:{paymentMethodId:String(cash.id),amount:1000000,idempotencyKey:'REC07-PAY-FINAL-A-V2'},expected:[201,409]}),call(`/invoices/${main.id}/payments`,{method:'POST',token:token.finance,body:{paymentMethodId:String(cash.id),amount:1000000,idempotencyKey:'REC07-PAY-FINAL-B-V2'},expected:[201,409]})]);
  concurrentPaymentStatuses=paid.map(x=>x.status).sort();finalPayment=paid.find(x=>x.status===201)?.data;
}
checks.push(['concurrent-payment-cap',concurrentPaymentStatuses.length===0||concurrentPaymentStatuses.join(',')==='201,409']);
main=(await call(`/invoices/${main.id}`,{token:token.finance})).data;
checks.push(['invoice-paid',main.status==='paid'&&[1189000,1089000].includes(Number(main.amount_paid))&&Number(main.balance_due)===0]);
checks.push(['paid-cancel-refused',(await call(`/invoices/${main.id}/cancel`,{method:'POST',token:token.finance,body:{reason:'Doit être refusé'},expected:[409]})).status===409]);

let credits=main.creditNotes??await call(`/invoices/${main.id}/credit-notes`,{token:token.finance}).then(x=>x.data);
let credit=credits.find(x=>x.idempotency_key==='REC07-CREDIT-100K-V2');
if(!credit)credit=(await call(`/invoices/${main.id}/credit-notes`,{method:'POST',token:token.finance,body:{amount:100000,reason:'Geste commercial REC07',issueDate:today,idempotencyKey:'REC07-CREDIT-100K-V2'},expected:[201]})).data;
const creditAgain=await call(`/invoices/${main.id}/credit-notes`,{method:'POST',token:token.finance,body:{amount:100000,reason:'Geste commercial REC07',issueDate:today,idempotencyKey:'REC07-CREDIT-100K-V2'},expected:[200]});
checks.push(['credit-idempotent',creditAgain.status===200&&String(creditAgain.data.id)===String(credit.id)]);
checks.push(['excess-credit-refused',(await call(`/invoices/${main.id}/credit-notes`,{method:'POST',token:token.finance,body:{amount:2000000,reason:'Excès',issueDate:today,idempotencyKey:'REC07-CREDIT-EXCESS'},expected:[409]})).status===409]);
payments=(await call(`/invoices/${main.id}/payments`,{token:token.finance})).data;
finalPayment=payments.find(x=>Number(x.amount)===1000000);
let existingRefund=main.creditNotes?.find(x=>String(x.id)===String(credit.id)&&Number(x.refunded_amount)>0);
let concurrentRefundStatuses=[];
if(!existingRefund){
  const refunded=await Promise.all([call(`/payments/${finalPayment.id}/refund`,{method:'POST',token:token.finance,body:{creditNoteId:String(credit.id),amount:100000,reason:'Remboursement REC07',idempotencyKey:'REC07-REFUND-A-V2'},expected:[201,409]}),call(`/payments/${finalPayment.id}/refund`,{method:'POST',token:token.finance,body:{creditNoteId:String(credit.id),amount:100000,reason:'Remboursement REC07 concurrent',idempotencyKey:'REC07-REFUND-B-V2'},expected:[201,409]})]);
  concurrentRefundStatuses=refunded.map(x=>x.status).sort();
}
checks.push(['concurrent-refund-cap',concurrentRefundStatuses.length===0||concurrentRefundStatuses.join(',')==='201,409']);
main=(await call(`/invoices/${main.id}`,{token:token.finance})).data;
checks.push(['refund-recalculation',main.status==='paid'&&Number(main.amount_paid)===1089000&&Number(main.balance_due)===0]);

list=(await call('/invoices?page=1&pageSize=100',{token:token.finance})).data;
let cancelled=asItems(list).find(x=>x.notes==='STABILISATION-ERP-07 CANCEL');
if(!cancelled){const made=await call('/invoices',{method:'POST',token:token.finance,body:invoiceBody('CANCEL',{items:item('Facture à annuler REC07',100000)}),expected:[201]});cancelled=(await call(`/invoices/${made.data.id}`,{token:token.finance})).data;await call(`/invoices/${cancelled.id}/status`,{method:'PATCH',token:token.finance,body:{status:'issued'}});await call(`/invoices/${cancelled.id}/cancel`,{method:'POST',token:token.finance,body:{reason:'Annulation contrôlée REC07'}});}
cancelled=(await call(`/invoices/${cancelled.id}`,{token:token.finance})).data;
checks.push(['unpaid-cancellation',cancelled.status==='cancelled'&&Number(cancelled.amount_paid)===0]);
checks.push(['cancelled-payment-refused',(await call(`/invoices/${cancelled.id}/payments`,{method:'POST',token:token.finance,body:{paymentMethodId:String(cash.id),amount:1,idempotencyKey:'REC07-CANCELLED-PAY'},expected:[409]})).status===409]);

const rbac=[];
for(const [role,t] of Object.entries(token)){
  const result=await call('/invoices?page=1&pageSize=5',{token:t,expected:[200,403]});
  rbac.push({role,status:result.status,financialFieldsVisible:result.status===200&&result.data.items?.[0]?.amount_paid!==null});
}
checks.push(['commercial-billing-denied',rbac.find(x=>x.role==='commercial').status===403]);
checks.push(['direction-readonly-visible',rbac.find(x=>x.role==='direction').status===200]);
checks.push(['delivery-billing-denied',rbac.find(x=>x.role==='delivery').status===403]);
checks.push(['accountant-concession-visible',rbac.find(x=>x.role==='accountant').status===200]);

await mkdir('/tmp/pdfs',{recursive:true});
const pdfs=[];
for(const [name,path] of [['invoice',`/invoices/${main.id}/pdf`],['receipt-partial',`/payments/${partial.id}/receipt`],['receipt-final',`/payments/${finalPayment.id}/receipt`]]){
  const pdf=await call(path,{token:token.finance,binary:true});const file=`/tmp/pdfs/rec07-${name}.pdf`;await writeFile(file,pdf.data);pdfs.push({name,file,size:pdf.data.length,valid:pdf.data.subarray(0,4).toString()==='%PDF'});checks.push([`pdf-${name}`,pdfs.at(-1).valid]);
}
const finalList=await call('/invoices?page=1&pageSize=100',{token:token.finance}),failed=checks.filter(([,ok])=>!ok);
const result={generatedAt:new Date().toISOString(),base,invoice:{id:String(main.id),number:main.invoice_number,status:main.status,total:Number(main.total),paid:Number(main.amount_paid),balance:Number(main.balance_due),credits:main.creditNotes?.map(x=>({id:String(x.id),number:x.credit_note_number,amount:Number(x.amount),refunded:Number(x.refunded_amount)}))},cancelledInvoice:{id:String(cancelled.id),number:cancelled.invoice_number,status:cancelled.status,total:Number(cancelled.total)},payments:(await call(`/invoices/${main.id}/payments`,{token:token.finance})).data.map(x=>({id:String(x.id),number:x.payment_number,amount:Number(x.amount),refunded:Number(x.refunded_amount),status:x.effective_status})),summary:finalList.data.summary,rbac,pdfs,checks:checks.map(([name,ok])=>({name,ok})),failed,timing:{count:timings.length,maxMs:Math.max(...timings.map(x=>x.ms)),averageMs:Math.round(timings.reduce((s,x)=>s+x.ms,0)/timings.length*100)/100},timings};
await writeFile('/tmp/stabilisation-erp-07-result.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failed.length)process.exitCode=1;
