import {generate} from 'otplib';

const base=process.env.FIN_E2E_API_URL??'http://127.0.0.1:3005/api';
const email=process.env.FIN_E2E_ADMIN_EMAIL,password=process.env.FIN_E2E_ADMIN_PASSWORD,secret=process.env.FIN_E2E_TOTP_SECRET;
if(!email||!password||!secret)throw new Error('Identifiants FIN_E2E requis');

const request=async(path,options={},expected)=>{
  const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers??{})}});
  const type=response.headers.get('content-type')??'';
  const body=type.includes('json')?await response.json():await response.arrayBuffer();
  if(expected!=null){if(response.status!==expected)throw new Error(`${path}: ${response.status}, attendu ${expected}: ${JSON.stringify(body)}`);return{status:response.status,body}}
  if(!response.ok)throw new Error(`${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
};
const login=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
const verified=await request('/auth/2fa/verify',{method:'POST',body:JSON.stringify({challengeToken:login.challengeToken,code:await generate({secret})})});
const auth=(path,options={},expected)=>request(path,{...options,headers:{Authorization:`Bearer ${verified.accessToken}`,...(options.headers??{})}},expected);
const post=(path,body,expected)=>auth(path,{method:'POST',body:JSON.stringify(body)},expected);
const patch=(path,body,expected)=>auth(path,{method:'PATCH',body:JSON.stringify(body)},expected);
await auth('/rbac/agency-context',{method:'PUT',body:JSON.stringify({agencyId:'1'})});

const suffix=Date.now();
const fixtures=await auth('/repair-orders?limit=1');
void fixtures;
const customerId='1',vehicleId=process.env.FIN_E2E_SAV_VEHICLE_ID,advisorId=process.env.FIN_E2E_SAV_ADVISOR_ID,
  technicianId=process.env.FIN_E2E_SAV_TECHNICIAN_ID,partId=process.env.FIN_E2E_SAV_PART_ID,partStockId=process.env.FIN_E2E_SAV_PART_STOCK_ID;
if([vehicleId,advisorId,technicianId,partId,partStockId].some(x=>!x))throw new Error('Identifiants de fixture SAV requis');

let order=await post('/repair-orders',{customerId,vehicleId,advisorId,mileage:42000,complaint:'Entretien complet de recette financière',expectedVehicleOrigin:'EXTERNAL'});
const orderId=String(order.id);
const forbiddenReceived=await patch(`/repair-orders/${orderId}/status`,{status:'received'},409);
order=await post(`/repair-orders/${orderId}/inspection`,{fuelLevel:'Demi-plein',cleanliness:'Propre',bodyworkDamage:'Aucun dommage nouveau',itemsInVehicle:'Triangle de signalisation',mileage:42000,observations:'Inspection de recette validée'});
order=await post(`/repair-orders/${orderId}/diagnostics`,{technicianId,diagnosis:'Filtre à remplacer et contrôle mécanique',recommendations:'Remplacement puis essai',estimatedHours:1});
const laborRate=(await auth(`/repair-orders/${orderId}/labor-rates`)).rates?.[0];
if(!laborRate?.id)throw new Error('Tarif de main-d’œuvre introuvable');
order=await post(`/repair-orders/${orderId}/estimate-items`,{itemType:'labor',description:'Main-d’œuvre entretien SAV',quantity:1,laborRateId:String(laborRate.id),discount:0,requestKey:`sav-labor-${suffix}`});
order=await post(`/repair-orders/${orderId}/estimate-items`,{itemType:'part',partId,quantity:2,discount:0,requestKey:`sav-part-${suffix}`});
const laborEstimate=order.estimateItems.find(x=>x.item_type==='labor'),partEstimate=order.estimateItems.find(x=>x.item_type==='part');
if(!laborEstimate||!partEstimate)throw new Error('Chiffrage SAV incomplet');
order=await post(`/repair-orders/${orderId}/estimate/issue`,{});
const forbiddenInvoice=await post(`/repair-orders/${orderId}/invoice`,{},409);
order=await post(`/repair-orders/${orderId}/approval`,{approved:true,customerName:'Client Historique',notes:'Accord de recette'});
await post(`/repair-orders/${orderId}/estimate-items/${laborEstimate.id}/intervention`,{technicianId});
order=await auth(`/repair-orders/${orderId}`);
const intervention=order.estimateItems.find(x=>String(x.id)===String(laborEstimate.id));
const interventionId=intervention?.intervention_id;
if(!interventionId)throw new Error('Intervention SAV introuvable');
const reservation=await post(`/repair-orders/${orderId}/estimate-items/${partEstimate.id}/reserve`,{partStockId});
const internalRequests=await auth('/parts-internal-requests?agencyId=1');
const internalRequest=internalRequests.find(x=>String(x.repair_order_id)===orderId);
if(!internalRequest)throw new Error('Demande interne de pièces introuvable');
let requestDetail=await auth(`/parts-internal-requests/${internalRequest.id}`);
const requestItem=requestDetail.items[0];
const delivery=await post(`/parts-internal-requests/${internalRequest.id}/deliveries`,{idempotencyKey:`sav-delivery-${suffix}`,items:[{requestItemId:String(requestItem.id),reservationId:String(reservation.id),quantity:2}],notes:'Remise magasin au SAV'});
requestDetail=await auth(`/parts-internal-requests/${internalRequest.id}`);
const deliveryItem=requestDetail.deliveryItems.find(x=>String(x.delivery_id)===String(delivery.id));
await post(`/parts-internal-deliveries/${delivery.id}/receive`,{idempotencyKey:`sav-receive-${suffix}`,items:[{deliveryItemId:String(deliveryItem.id),quantityReceived:2}],notes:'Réception physique conforme'});
await patch(`/repair-orders/${orderId}/parts/reservations/${reservation.id}`,{status:'consumed',quantity:1});
const returned=await post(`/parts-internal-delivery-items/${deliveryItem.id}/returns`,{quantity:1,idempotencyKey:`sav-return-${suffix}`,conditionCode:'GOOD',reason:'Pièce non utilisée'});
await post(`/parts-internal-returns/${returned.id}/receive`,{decision:'RESTOCKED'});

await post(`/repair-orders/${orderId}/items`,{itemType:'labor',estimateItemId:String(laborEstimate.id),interventionId:String(interventionId),quantity:1,requestKey:`sav-actual-labor-${suffix}`});
const session=await post(`/repair-orders/${orderId}/sessions/start`,{interventionId:String(interventionId),technicianId});
await patch(`/repair-orders/${orderId}/sessions/${session.id}/stop`,{});
order=await patch(`/repair-orders/${orderId}/interventions/${interventionId}/status`,{status:'completed'});
const prematureQuality=await post(`/repair-orders/${orderId}/quality-control`,{result:'passed',plannedWorkCompleted:true,defectCorrected:true,noLeaks:true,levelsChecked:true,cleanlinessChecked:true},409);
order=await patch(`/repair-orders/${orderId}/status`,{status:'quality_control'});
order=await post(`/repair-orders/${orderId}/quality-control`,{result:'passed',plannedWorkCompleted:true,defectCorrected:true,roadTestPerformed:true,noLeaks:true,levelsChecked:true,cleanlinessChecked:true,observations:'Contrôle qualité conforme'});
const invoice=order.invoice;
if(!invoice?.id||order.status!=='invoiced')throw new Error('Facture SAV non générée');
const methods=await auth('/invoices/payment-methods');
const method=methods.find(x=>x.code==='CASH')??methods.find(x=>!x.requires_attachment);
if(!method)throw new Error('Moyen de paiement introuvable');
const destinations=await auth(`/invoices/${invoice.id}/payment-destinations?paymentMethodId=${method.id}`),account=destinations.items?.[0];
if(!account)throw new Error('Compte de trésorerie compatible introuvable');
const payment=await post(`/invoices/${invoice.id}/payments`,{paymentMethodId:String(method.id),treasuryAccountId:String(account.id),amount:Number(invoice.total),paymentDate:new Date().toISOString().slice(0,10),reference:`SAV-E2E-${suffix}`,idempotencyKey:`sav-payment-${suffix}`});
order=await auth(`/repair-orders/${orderId}`);
if(!order.financially_cleared)throw new Error('Facture SAV non soldée');
await post(`/repair-orders/${orderId}/handover`,{customerName:'Client Historique',mileageOut:42001,observations:'Restitution après règlement'});
const report=await auth(`/reports/finance?from=${new Date().toISOString().slice(0,10)}&to=${new Date().toISOString().slice(0,10)}&agencyId=1`);
console.log(JSON.stringify({orderId,invoiceId:String(invoice.id),paymentId:String(payment.id),treasuryMovementId:String(payment.treasuryMovementId),amount:Number(invoice.total),forbiddenReceived:forbiddenReceived.status,forbiddenInvoice:forbiddenInvoice.status,prematureQuality:prematureQuality.status,finalStatus:'closed',report},null,2));
