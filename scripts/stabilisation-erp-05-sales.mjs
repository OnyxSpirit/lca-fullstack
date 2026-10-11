import {randomUUID} from 'node:crypto';

const base=process.env.RECETTE_API_URL??'http://127.0.0.1:3004/api';
const adminEmail=process.env.ADMIN_EMAIL,adminPassword=process.env.ADMIN_PASSWORD,userPassword=process.env.RECETTE_USER_PASSWORD;
if(!adminEmail||!adminPassword||!userPassword)throw new Error('Variables recette manquantes');
const timings=[],checks=[];
async function call(path,{method='GET',token,body,expected=[200],raw=false}={}){
  const started=performance.now(),response=await fetch(base+path,{method,headers:{...(token?{authorization:`Bearer ${token}`} :{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  const buffer=raw?Buffer.from(await response.arrayBuffer()):null,text=raw?'':await response.text();let data=null;
  if(!raw)try{data=text?JSON.parse(text):null}catch{data={raw:text.slice(0,300)}}
  const ms=Math.round((performance.now()-started)*100)/100;timings.push({method,path,status:response.status,ms,bytes:buffer?.length??Buffer.byteLength(text)});
  if(!expected.includes(response.status))throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return{status:response.status,data,buffer,headers:Object.fromEntries(response.headers),ms};
}
const login=async(email,password=userPassword)=>(await call('/auth/login',{method:'POST',body:{email,password}})).data.accessToken;
const token={admin:await login(adminEmail,adminPassword),manager:await login('recette.responsable_commercial@lca-test.cg'),commercial:await login('recette.commercial@lca-test.cg'),accountant:await login('recette.comptable@lca-test.cg'),finance:await login('recette.responsable_financier@lca-test.cg'),delivery:await login('recette.responsable_livraison@lca-test.cg'),direction:await login('recette.direction@lca-test.cg')};
const users=(await call('/users',{token:token.admin})).data,byEmail=email=>users.find(user=>user.email===email),adminUser=byEmail(adminEmail),originalAdminAgency=String(byEmail(adminEmail).agencyId);
const manager=byEmail('recette.responsable_commercial@lca-test.cg'),commercial=byEmail('recette.commercial@lca-test.cg');
const setAdminAgency=async agencyId=>{if(String(adminUser.agencyId)!==String(agencyId)){await call(`/users/${adminUser.id}`,{method:'PATCH',token:token.admin,body:{agencyId:String(agencyId)}});adminUser.agencyId=String(agencyId);}};
const vehicles=(await call('/vehicles?search=REC04&view=all&page=1&pageSize=100',{token:token.admin})).data.items;
const vehicle=Object.fromEntries(vehicles.map(row=>[row.vin,row]));
const customers=(await call('/customers?search=REC03&page=1&pageSize=100',{token:token.admin})).data.items??[];
const individual=customers.find(row=>String(row.agencyId)==='3')??(await call('/customers/1',{token:token.admin})).data;
const company=customers.find(row=>String(row.agencyId)==='2')??(await call('/customers/2',{token:token.admin})).data;
const saleBody=(customerId,vehicleId,agencyId,salespersonId,key,notes)=>({customerId:String(customerId),vehicleId:String(vehicleId),agencyId:String(agencyId),salespersonId:String(salespersonId),discount:0,depositAmount:0,taxMode:'TAXABLE',priceInputMode:'HT',notes,idempotencyKey:key,warranty:{decision:'NOT_APPLICABLE'}});
const status=(saleId,value,expected=[200],reason)=>call(`/sales/${saleId}/status`,{method:'PATCH',token:token.admin,body:{status:value,...(reason?{reason}:{})},expected});
const advance=async(saleId,target)=>{const order=['reserved','ordered','confirmed','preparation','ready_for_delivery'],targetIndex=order.indexOf(target);let current=(await call(`/sales/${saleId}`,{token:token.admin})).data;for(let index=order.indexOf(current.status)+1;index<=targetIndex;index++){await status(saleId,order[index]);current=(await call(`/sales/${saleId}`,{token:token.admin})).data;}return current;};
const createInvoice=async(sale,customerId,agencyId,key)=>call('/invoices',{method:'POST',token:token.admin,body:{agencyId:String(agencyId),customerId:String(customerId),saleId:String(sale.id),invoiceType:'vehicle',issueDate:new Date().toISOString().slice(0,10),dueDate:null,notes:'REC05 facture véhicule',idempotencyKey:key,items:[{vehicleId:String(sale.vehicle_id),description:'Véhicule REC05',quantity:1,unitPrice:Number(sale.total),discount:0}]},expected:[201]});
const pdfCheck=async(path,label)=>{const result=await call(path,{token:token.admin,raw:true});const ok=result.headers['content-type']?.includes('application/pdf')&&result.buffer.subarray(0,5).toString()==='%PDF-'&&result.buffer.length>1000;checks.push({label,status:result.status,ok,bytes:result.buffer.length});return ok};

// Validation, stock non disponible et périmètre inter-agences.
checks.push({label:'unauthenticated-list',status:(await call('/sales',{expected:[401]})).status});
checks.push({label:'missing-idempotency-key',status:(await call('/sales',{method:'POST',token:token.admin,body:{},expected:[400]})).status});
checks.push({label:'unavailable-vehicle',status:(await call('/sales',{method:'POST',token:token.admin,body:saleBody(company.id,vehicle.REC04UC0000000004.id,4,manager.id,`REC05-unavailable-${randomUUID()}`,'REC05 véhicule indisponible'),expected:[403,409]})).status});
checks.push({label:'cross-agency',status:(await call('/sales',{method:'POST',token:token.admin,body:saleBody(individual.id,vehicle.REC04UC0000000002.id,2,manager.id,`REC05-cross-${randomUUID()}`,'REC05 agence incompatible'),expected:[403]})).status});

// Deux créations concurrentes : une seule réservation doit gagner. Le gagnant devient le dossier annulé.
await setAdminAgency('3');
const concurrentBodies=[0,1].map(index=>saleBody(individual.id,vehicle.REC04VN0000000003.id,3,commercial.id,`REC05-concurrent-${index}-${randomUUID()}`,'REC05 particulier concurrence puis annulation'));
const concurrency=await Promise.all(concurrentBodies.map(body=>call('/sales',{method:'POST',token:token.admin,body,expected:[201,409]})));
const cancelledSale=concurrency.find(x=>x.status===201)?.data;if(!cancelledSale)throw new Error('Aucune création concurrente gagnante');
checks.push({label:'concurrent-create',statuses:concurrency.map(x=>x.status)});
checks.push({label:'cancel-without-reason',status:(await status(cancelledSale.id,'cancelled',[400])).status});
await status(cancelledSale.id,'cancelled',[200],'Annulation contrôlée REC05');
checks.push({label:'cancel-terminal',status:(await status(cancelledSale.id,'ordered',[409])).status});
checks.push({label:'invoice-after-cancel',status:(await call('/invoices',{method:'POST',token:token.admin,body:{agencyId:'3',customerId:String(individual.id),saleId:String(cancelledSale.id),invoiceType:'vehicle',issueDate:new Date().toISOString().slice(0,10),idempotencyKey:`REC05-cancel-invoice-${randomUUID()}`,items:[{description:'Interdit',quantity:1,unitPrice:1,discount:0}]},expected:[409]})).status});

// Dossier entreprise partiellement réglé, puis autorisé avec solde et prêt à livrer.
await setAdminAgency('2');
const existingRec05=(await call(`/sales?customerId=${company.id}`,{token:token.admin})).data,existingPartial=(existingRec05.items??existingRec05).find(row=>String(row.vehicle_id)===String(vehicle.REC04UC0000000002.id)&&row.status!=='cancelled');
const partialKey=existingPartial?.idempotency_key??`REC05-partial-${randomUUID()}`,partialCreated=existingPartial?{status:200,data:existingPartial}:await call('/sales',{method:'POST',token:token.admin,body:saleBody(company.id,vehicle.REC04UC0000000002.id,2,manager.id,partialKey,'REC05 entreprise VO paiement partiel et autorisation'),expected:[201]});
const partialRetry=await call('/sales',{method:'POST',token:token.admin,body:saleBody(company.id,vehicle.REC04UC0000000002.id,2,manager.id,partialKey,'REC05 entreprise VO paiement partiel et autorisation'),expected:[201]});
checks.push({label:'sale-idempotency',sameId:String(partialCreated.data.id)===String(partialRetry.data.id),statuses:[partialCreated.status,partialRetry.status]});
await advance(partialCreated.data.id,'confirmed');
checks.push({label:'prepare-without-invoice',status:(await status(partialCreated.data.id,'preparation',[409])).status});
let partialSale=(await call(`/sales/${partialCreated.data.id}`,{token:token.admin})).data;
const partialInvoice=partialSale.invoice_id?(await call(`/invoices/${partialSale.invoice_id}`,{token:token.admin})).data:(await createInvoice(partialSale,company.id,2,`REC05-invoice-partial-${randomUUID()}`)).data;
if(partialInvoice.status==='draft'||partialInvoice.id&&!partialInvoice.invoice_number)await call(`/invoices/${partialInvoice.id}/status`,{method:'PATCH',token:token.admin,body:{status:'issued'}});
const methods=(await call('/invoices/payment-methods',{token:token.admin})).data,method=methods.find(x=>!x.requires_reference)??methods[0];
let flow=(await call('/treasury/flow-configuration',{token:token.admin})).data;
if(!flow.isReady){let account=flow.accounts.find(x=>String(x.agency_id)==='2'&&x.code==='REC05_CASH');if(!account){const created=(await call('/treasury/accounts',{method:'POST',token:token.admin,body:{agencyId:'2',concessionId:String(flow.concessionId),code:'REC05_CASH',name:'Caisse recette REC05',description:'Compte isolé pour recette des encaissements vente',accountType:'CASH',currencyCode:'XAF'},expected:[201]})).data;account={id:created.id};}await call('/treasury/flow-mappings',{method:'PUT',token:token.admin,body:{agencyId:'2',paymentMethodId:String(method.id),treasuryAccountId:String(account.id)}});await call('/treasury/flow-readiness',{method:'PATCH',token:token.admin,body:{isReady:true,concessionId:String(flow.concessionId)}});flow=(await call('/treasury/flow-configuration',{token:token.admin})).data;}
const partialAmount=Math.round(Number(partialSale.total)*.2*100)/100;
const partialPayment=(await call(`/invoices/${partialInvoice.id}/payments`,{method:'POST',token:token.admin,body:{paymentMethodId:String(method.id),amount:partialAmount,reference:method.requires_reference?'REC05-PARTIEL':null,notes:'REC05 acompte partiel',idempotencyKey:`REC05-payment-partial-${randomUUID()}`},expected:[201]})).data;
checks.push({label:'prepare-partial-blocked',status:(await status(partialSale.id,'preparation',[409])).status});
const authorization=(await call('/delivery/financial-authorizations',{method:'POST',token:token.admin,body:{saleId:String(partialSale.id),reason:'Dérogation contrôlée REC05 avec garantie entreprise',guaranteeType:'Bon de commande entreprise',guaranteeDetails:'Solde à échéance contractuelle',guaranteeReference:'REC05-GARANTIE-ENTREPRISE',balanceDueDate:new Date(Date.now()+14*86400000).toISOString().slice(0,10),paymentTerms:'Solde sous quatorze jours',clientRequestId:randomUUID()},expected:[201]})).data;
await advance(partialSale.id,'ready_for_delivery');

// Dossier entreprise intégralement réglé, sans dérogation.
const paidCreated=(await call('/sales',{method:'POST',token:token.admin,body:saleBody(company.id,vehicle.REC04UC0000000006.id,2,manager.id,`REC05-paid-${randomUUID()}`,'REC05 entreprise VO soldée'),expected:[201]})).data;
await status(paidCreated.id,'ordered');await status(paidCreated.id,'confirmed');
let paidSale=(await call(`/sales/${paidCreated.id}`,{token:token.admin})).data;
const paidInvoice=(await createInvoice(paidSale,company.id,2,`REC05-invoice-paid-${randomUUID()}`)).data;
await call(`/invoices/${paidInvoice.id}/status`,{method:'PATCH',token:token.admin,body:{status:'issued'}});
const paidPayment=(await call(`/invoices/${paidInvoice.id}/payments`,{method:'POST',token:token.admin,body:{paymentMethodId:String(method.id),amount:Number(paidSale.total),reference:method.requires_reference?'REC05-SOLDE':null,notes:'REC05 règlement intégral',idempotencyKey:`REC05-payment-paid-${randomUUID()}`},expected:[201]})).data;
await status(paidSale.id,'preparation');await status(paidSale.id,'ready_for_delivery');

// Documents réels, visibilité RBAC et traces applicatives.
for(const [path,label] of [[`/documents/business/sale/${partialSale.id}/pdf`,'sale-order-partial'],[`/invoices/${partialInvoice.id}/pdf`,'invoice-partial'],[`/payments/${partialPayment.id}/receipt`,'receipt-partial'],[`/documents/business/sale/${paidSale.id}/pdf`,'sale-order-paid'],[`/invoices/${paidInvoice.id}/pdf`,'invoice-paid'],[`/payments/${paidPayment.id}/receipt`,'receipt-paid']])await pdfCheck(path,label);
const rbac={};for(const name of ['manager','commercial','accountant','finance','delivery','direction']){const result=await call('/sales?page=1&pageSize=100',{token:token[name],expected:[200,403]});rbac[name]={status:result.status,count:result.status===200?(result.data.items?.length??result.data.length??0):null};}
checks.push({label:'commercial-other-agency-detail',status:(await call(`/sales/${partialSale.id}`,{token:token.commercial,expected:[404]})).status});
checks.push({label:'accountant-create-sale',status:(await call('/sales',{method:'POST',token:token.accountant,body:saleBody(company.id,vehicle.REC04CC1681239547.id,1,manager.id,`REC05-rbac-${randomUUID()}`,'Interdit RBAC'),expected:[403]})).status});
const activity=(await call('/activity?module=sales&page=1&pageSize=100',{token:token.admin})).data;
const notifications=(await call('/notifications?scope=global&page=1&pageSize=100',{token:token.admin})).data;
for(let i=0;i<10;i++){await call('/sales?page=1&pageSize=20',{token:token.admin});await call(`/sales/${partialSale.id}`,{token:token.admin});}
const finalSales=await Promise.all([cancelledSale.id,partialSale.id,paidSale.id].map(id=>call(`/sales/${id}`,{token:token.admin}).then(x=>x.data)));
await setAdminAgency(originalAdminAgency);
const sorted=timings.map(x=>x.ms).sort((a,b)=>a-b),pct=p=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)];
console.log(JSON.stringify({generatedAt:new Date().toISOString(),sales:finalSales.map(x=>({id:x.id,saleNumber:x.sale_number,customerId:x.customer_id,vehicleId:x.vehicle_id,agencyId:x.agency_id,status:x.status,total:Number(x.total),paid:x.invoice_amount_paid==null?null:Number(x.invoice_amount_paid),balance:x.invoice_balance_due==null?null:Number(x.invoice_balance_due),invoiceId:x.invoice_id})),invoices:{partial:partialInvoice,paid:paidInvoice},payments:{partial:partialPayment,paid:paidPayment},authorization:{id:authorization.id,status:authorization.status,balanceDueSnapshot:Number(authorization.balance_due_snapshot)},checks,rbac,activity:{total:activity.pagination?.total,actions:activity.rows?.filter(x=>['sale.created','sale.status_changed','sale.cancelled'].includes(x.action)).length},notifications:{total:notifications.total,saleEvents:notifications.items?.filter(x=>String(x.eventType).startsWith('sale.')).length},performance:{calls:timings.length,averageMs:Math.round(timings.reduce((s,x)=>s+x.ms,0)/timings.length*100)/100,medianMs:pct(.5),p95Ms:pct(.95),maxMs:sorted.at(-1),errors5xx:timings.filter(x=>x.status>=500).length},timings},null,2));
