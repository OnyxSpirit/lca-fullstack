import assert from 'node:assert/strict';
import { generate } from 'otplib';

const base=process.env.LCA02_BASE_URL??'http://127.0.0.1:3001/api';
const email=process.env.LCA02_EMAIL;
const password=process.env.LCA02_PASSWORD;
let token='';

async function raw(path,{method='GET',body,auth=true}={}){
  const response=await fetch(base+path,{method,headers:{...(body===undefined?{}:{'content-type':'application/json'}),...(auth&&token?{authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const type=response.headers.get('content-type')??'';
  const payload=type.includes('json')?await response.json():await response.arrayBuffer();
  return{status:response.status,payload,headers:response.headers};
}
async function api(path,options={}){const result=await raw(path,options);assert.ok(result.status>=200&&result.status<300,`${options.method??'GET'} ${path}: HTTP ${result.status} ${JSON.stringify(result.payload)}`);return result.payload}

async function authenticate(){
  const login=await raw('/auth/login',{method:'POST',body:{email,password},auth:false});assert.equal(login.status,200);
  let result=login.payload;
  if(result.status==='two_factor_setup_required'){
    const setup=await api('/auth/2fa/challenge/setup',{method:'POST',body:{challengeToken:result.challengeToken},auth:false});
    const code=await generate({strategy:'totp',secret:setup.manualKey,algorithm:'sha1',digits:6,period:30});
    result=await api('/auth/2fa/challenge/confirm',{method:'POST',body:{challengeToken:result.challengeToken,code},auth:false});
  }
  assert.equal(result.status,'authenticated');assert.ok(result.accessToken);token=result.accessToken;
}

async function createQuotedDiagnostic(vehicleId,taxMode='TAXABLE',withPart=true){
  const created=await api('/service-diagnostics',{method:'POST',body:{customerId:'1',vehicleId:String(vehicleId),advisorId:'2',mileage:vehicleId===1?12050:150,complaint:'Contrôle complet de qualification LCA-02'}});
  const id=String(created.id);
  await api(`/service-diagnostics/${id}`,{method:'PATCH',body:{status:'FINALIZED',diagnosisSummary:'Diagnostic finalisé : remplacement et contrôle recommandés.'}});
  await api(`/service-diagnostics/${id}/items`,{method:'POST',body:{itemType:'labor',description:'Main-d’œuvre de qualification',quantity:2,unitPrice:35000,discount:5000}});
  if(withPart)await api(`/service-diagnostics/${id}/items`,{method:'POST',body:{itemType:'part',partId:'1',description:'Filtre de qualification',quantity:2,unitPrice:15000,discount:0}});
  await api(`/service-diagnostics/${id}/issue`,{method:'POST',body:{taxMode,taxJustification:taxMode==='TAX_EXEMPT'?'Exonération fictive autorisée pour qualification':undefined}});
  return{id,detail:await api(`/service-diagnostics/${id}`)};
}

await authenticate();
const before=await api('/repair-orders?page=1&pageSize=100');
const external=await createQuotedDiagnostic(1,'TAXABLE');
assert.equal(external.detail.status,'QUOTED');assert.equal(external.detail.repair_order_id,null);assert.equal(Number(external.detail.subtotal),95000);assert.equal(Number(external.detail.tax_total),17955);assert.equal(Number(external.detail.total),112955);
const diagnosticPdf=await raw(`/service-diagnostics/${external.id}/document`);assert.equal(diagnosticPdf.status,200);assert.equal(Buffer.from(diagnosticPdf.payload).subarray(0,4).toString(),'%PDF');
const immutableQuote=await raw(`/service-diagnostics/${external.id}/items`,{method:'POST',body:{itemType:'labor',description:'Modification interdite',quantity:1,unitPrice:1}});assert.equal(immutableQuote.status,409);
const beforeAccept=await api('/repair-orders?page=1&pageSize=100');assert.equal(beforeAccept.total,before.total);
const concurrent=await Promise.all([raw(`/service-diagnostics/${external.id}/accept`,{method:'POST',body:{}}),raw(`/service-diagnostics/${external.id}/accept`,{method:'POST',body:{}})]);
assert.deepEqual(concurrent.map(item=>item.status).sort(),[200,201]);assert.equal(String(concurrent[0].payload.id),String(concurrent[1].payload.id));
const externalOrderId=String(concurrent[0].payload.id),externalOrder=await api(`/repair-orders/${externalOrderId}`);
assert.equal(externalOrder.vehicle_commercial_origin,'EXTERNAL');assert.equal(externalOrder.status,'in_progress');assert.equal(Number(externalOrder.estimated_total),112955);assert.equal(externalOrder.approvals.length,1);assert.equal(externalOrder.estimateItems.length,2);
const partRequest=concurrent.find(item=>item.payload.requestId)?.payload.requestId;assert.ok(partRequest,'La demande interne de pièces doit être créée à l’acceptation');
const replay=await raw(`/service-diagnostics/${external.id}/accept`,{method:'POST',body:{}});assert.equal(replay.status,200);assert.equal(String(replay.payload.id),externalOrderId);
const invalidDirect=await raw('/repair-orders',{method:'POST',body:{customerId:'x',vehicleId:'1'}});assert.equal(invalidDirect.status,400);
const direct=await raw('/repair-orders',{method:'POST',body:{customerId:'1',vehicleId:'1'}});assert.equal(direct.status,409);

const laborEstimate=externalOrder.estimateItems.find(item=>item.item_type==='labor');assert.ok(laborEstimate);
const withIntervention=await api(`/repair-orders/${externalOrderId}/estimate-items/${laborEstimate.id}/intervention`,{method:'POST',body:{}});
const intervention=withIntervention.interventions.find(item=>String(item.estimate_item_id)===String(laborEstimate.id));assert.ok(intervention);
await api(`/repair-orders/${externalOrderId}/interventions/${intervention.id}/technicians`,{method:'PUT',body:{employeeIds:['1','2','3']}});
const assigned=await api(`/repair-orders/${externalOrderId}`);assert.equal(assigned.interventions.find(item=>String(item.id)===String(intervention.id)).technician_assignments.length,3);
await api(`/repair-orders/${externalOrderId}/interventions/${intervention.id}/technicians`,{method:'PUT',body:{employeeIds:['1','3']}});
const reassigned=await api(`/repair-orders/${externalOrderId}`);assert.equal(reassigned.interventions.find(item=>String(item.id)===String(intervention.id)).technician_assignments.length,2);
const candidates=await api(`/repair-orders/${externalOrderId}/technician-employees`);assert.equal(candidates.length,3);assert.ok(candidates.every(item=>!('email'in item)&&!('phone'in item)&&!('salary'in item)));

const refused=await createQuotedDiagnostic(1,'TAX_EXEMPT',false);await api(`/service-diagnostics/${refused.id}`,{method:'PATCH',body:{status:'REFUSED'}});const refusedDetail=await api(`/service-diagnostics/${refused.id}`);assert.equal(refusedDetail.status,'REFUSED');assert.equal(refusedDetail.repair_order_id,null);
const internal=await createQuotedDiagnostic(2,'TAX_EXEMPT',false);assert.equal(Number(internal.detail.tax_total),0);const internalAccept=await raw(`/service-diagnostics/${internal.id}/accept`,{method:'POST',body:{}});assert.equal(internalAccept.status,201);const internalOrder=await api(`/repair-orders/${internalAccept.payload.id}`);assert.equal(internalOrder.vehicle_commercial_origin,'CONCESSION');assert.equal(internalOrder.tax_mode,'TAX_EXEMPT');

const inventoryBeforeSales=await api('/parts-inventory?agencyId=1&type=sale&page=1&pageSize=100');
const saleScenarios=[['REGISTERED','TAXABLE'],['REGISTERED','EXEMPT'],['THIRD_PARTY','TAXABLE'],['THIRD_PARTY','EXEMPT']];
const sales=[];
for(const[customerType,taxMode]of saleScenarios){const sale=await api('/part-sales',{method:'POST',body:{agencyId:'1',customerType,taxMode,customerId:customerType==='REGISTERED'?'1':undefined,thirdPartyName:customerType==='THIRD_PARTY'?`Client tiers ${taxMode}`:undefined,thirdPartyPhone:customerType==='THIRD_PARTY'?'+242000000001':undefined,thirdPartyAddress:customerType==='THIRD_PARTY'?'Adresse fictive':undefined,idempotencyKey:`qa02-${customerType}-${taxMode}-0001`,items:[{partId:'1',partStockId:'3',quantity:2},{partId:'2',partStockId:'4',quantity:1}]}});const detail=await api(`/part-sales/${sale.id}`);assert.equal(detail.items.length,2);assert.equal(Number(detail.total),taxMode==='TAXABLE'?71340:60000);await api(`/part-sales/${sale.id}/release`,{method:'POST',body:{idempotencyKey:`qa02-release-${sale.id}-0001`}});sales.push({id:String(sale.id),invoiceNumber:detail.invoice_number,customerType,taxMode,total:Number(detail.total)})}
const stocks=await api('/parts-inventory?agencyId=1&type=sale&page=1&pageSize=100');assert.equal(stocks.total-inventoryBeforeSales.total,8);assert.equal(Number(stocks.totals.quantity_sold)-Number(inventoryBeforeSales.totals.quantity_sold),12);assert.equal(Number(stocks.totals.commercial_amount)-Number(inventoryBeforeSales.totals.commercial_amount),240000);
const byInvoice=await api(`/parts-inventory?agencyId=1&invoice=${encodeURIComponent(sales[0].invoiceNumber)}&page=1&pageSize=100`);assert.equal(byInvoice.total,2);
const csv=await raw(`/parts-inventory/export-filtered/csv?agencyId=1&invoice=${encodeURIComponent(sales[0].invoiceNumber)}`);assert.equal(csv.status,200);assert.match(new TextDecoder().decode(csv.payload),/"Mouvement";.*"Référence pièce"/);
const xlsx=await raw('/parts-inventory/export-filtered/xlsx?agencyId=1&type=sale');assert.equal(xlsx.status,200);assert.equal(Buffer.from(xlsx.payload).subarray(0,2).toString(),'PK');

console.log(JSON.stringify({verdict:'REUSSI',diagnosticExterne:external.id,ordreExterne:externalOrderId,reponsesConcurrence:concurrent.map(item=>item.status),rejeu:replay.status,demandePieces:partRequest,documentDiagnostic:{octets:diagnosticPdf.payload.byteLength,signature:'%PDF'},devisImmuable:immutableQuote.status,techniciensAffectes:3,techniciensApresModification:2,diagnosticRefuse:refused.id,ordreInterne:String(internalAccept.payload.id),ventes:sales,inventaire:{lignesVentesAjoutees:stocks.total-inventoryBeforeSales.total,quantiteVendueAjoutee:Number(stocks.totals.quantity_sold)-Number(inventoryBeforeSales.totals.quantity_sold),montantCommercialAjoute:Number(stocks.totals.commercial_amount)-Number(inventoryBeforeSales.totals.commercial_amount),filtreFacture:byInvoice.total},exports:{csvOctets:csv.payload.byteLength,xlsxOctets:xlsx.payload.byteLength},creationDirecte:{identifiantInvalide:invalidDirect.status,contournementValide:direct.status}},null,2));
