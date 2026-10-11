import {mkdir,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';

const base=process.env.RECETTE_API_URL??'http://127.0.0.1:3004/api';
const adminEmail=process.env.ADMIN_EMAIL,adminPassword=process.env.ADMIN_PASSWORD,userPassword=process.env.RECETTE_USER_PASSWORD;
if(!adminEmail||!adminPassword||!userPassword)throw new Error('Variables de recette manquantes');
const timings=[],checks=[];
async function call(path,{method='GET',token,body,expected=[200],binary=false}={}){
  const start=performance.now(),response=await fetch(base+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});
  const elapsed=Math.round((performance.now()-start)*100)/100;timings.push({method,path,status:response.status,ms:elapsed});
  if(binary){const data=Buffer.from(await response.arrayBuffer());if(!expected.includes(response.status))throw new Error(`${method} ${path}: ${response.status}`);return{status:response.status,data,headers:Object.fromEntries(response.headers)}}
  const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null}catch{data={raw:raw.slice(0,300)}}
  if(!expected.includes(response.status))throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);
  return{status:response.status,data};
}
const login=(email,password,expected=[200])=>call('/auth/login',{method:'POST',body:{email,password},expected});
const adminSession=await login(adminEmail,adminPassword),admin=adminSession.data.accessToken;
const initialCandidates=(await call('/deliveries/candidates',{token:admin})).data;
checks.push(['candidate-state-known',initialCandidates.every(item=>['2','5'].includes(String(item.sale_id))) ]);
checks.push(['unauthenticated',(await call('/deliveries',{expected:[401]})).status===401]);
checks.push(['invalid-id',(await call('/deliveries/not-an-id',{token:admin,expected:[400]})).status===400]);

let users=(await call('/users',{token:admin})).data;
const deliveryEmail='recette.livraison.nord@lca-test.cg';
let specialist=users.find(user=>user.email===deliveryEmail);
if(!specialist){
  specialist=(await call('/users',{method:'POST',token:admin,body:{firstName:'Recette',lastName:'Livraison Nord',email:deliveryEmail,password:userPassword,jobTitle:'Responsable livraison de recette',agencyId:'2',roleCode:'RESPONSABLE_LIVRAISON'},expected:[201]})).data;
}
const specialistSession=await login(deliveryEmail,userPassword),token=specialistSession.data.accessToken;
const me=(await call('/auth/me',{token})).data;
checks.push(['specialist-role',me.user.role.code==='RESPONSABLE_LIVRAISON']);
for(const saleId of ['2','5']){
  if(initialCandidates.some(item=>String(item.sale_id)===saleId)){
    const specialists=(await call(`/deliveries/candidates/${saleId}/specialists`,{token})).data;
    if(!specialists.some(item=>String(item.id)===String(specialist.id)))throw new Error(`Spécialiste absent pour la vente ${saleId}`);
  }
}

checks.push(['cancelled-sale-rejected',(await call('/deliveries',{method:'POST',token:admin,body:{saleId:'4',deliverySpecialistId:String(specialist.id),scheduledAt:new Date(Date.now()+86400000).toISOString()},expected:[409]})).status===409]);
checks.push(['missing-specialist-rejected',(await call('/deliveries',{method:'POST',token,body:{saleId:'5',scheduledAt:new Date(Date.now()+86400000).toISOString()},expected:[400]})).status===400]);

const tomorrow=new Date(Date.now()+86400000),planningDate=tomorrow.toISOString().slice(0,10);
tomorrow.setUTCHours(10,0,0,0);
const createBody=saleId=>({saleId,deliverySpecialistId:String(specialist.id),scheduledAt:tomorrow.toISOString(),deliveryLocation:'Agence Recette Nord',customerNotes:`Campagne STABILISATION-ERP-06, vente ${saleId}`});
let existing=(await call('/deliveries',{token})).data;
const existingItems=Array.isArray(existing)?existing:existing.items;
let delivery5=existingItems.find(item=>String(item.sale_id)==='5'&&item.status!=='cancelled');
if(!delivery5){
  const concurrent=await Promise.all([call('/deliveries',{method:'POST',token,body:createBody('5'),expected:[201,409]}),call('/deliveries',{method:'POST',token,body:createBody('5'),expected:[201,409]})]);
  checks.push(['concurrent-planning',concurrent.filter(result=>result.status===201).length===1&&concurrent.filter(result=>result.status===409).length===1]);
  delivery5=concurrent.find(result=>result.status===201)?.data;
}else checks.push(['single-active-delivery-sale-5',existingItems.filter(item=>String(item.sale_id)==='5'&&item.status!=='cancelled').length===1]);
let delivery2=existingItems.find(item=>String(item.sale_id)==='2'&&item.status!=='cancelled');
if(!delivery2)delivery2=(await call('/deliveries',{method:'POST',token,body:createBody('2'),expected:[201]})).data;
const deliveries=[delivery2,delivery5];

const later=new Date(tomorrow.getTime()+3600000);
if(!['delivered','cancelled'].includes(delivery5.status))await call(`/deliveries/${delivery5.id}/reschedule`,{method:'PATCH',token,body:{scheduledAt:later.toISOString(),reason:'Contrôle fonctionnel du report ERP-06'}});

function crc32(buffer){let crc=0xffffffff;for(const byte of buffer){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}return (crc^0xffffffff)>>>0}
function chunk(type,data){const name=Buffer.from(type),length=Buffer.alloc(4),crc=Buffer.alloc(4);length.writeUInt32BE(data.length);crc.writeUInt32BE(crc32(Buffer.concat([name,data])));return Buffer.concat([length,name,data,crc])}
function signaturePng(){const width=240,height=80,raw=Buffer.alloc((width*4+1)*height,255);for(let y=0;y<height;y++){raw[y*(width*4+1)]=0;for(let x=0;x<width;x++){const offset=y*(width*4+1)+1+x*4;const ink=Math.abs(y-(40+Math.sin(x/13)*18))<2&&x>12&&x<225;if(ink)raw.fill(25,offset,offset+3);raw[offset+3]=255}}const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);ihdr[8]=8;ihdr[9]=6;return Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw)),chunk('IEND',Buffer.alloc(0))])}
const signature=`data:image/png;base64,${signaturePng().toString('base64')}`;
const attachment='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

for(const delivery of deliveries){
  const id=String(delivery.id);
  let detail=(await call(`/deliveries/${id}`,{token})).data;
  if(detail.status==='delivered'){
    checks.push([`snapshot-${delivery.sale_id}`,detail.checklist_progress.mandatoryTotal===10]);
    checks.push([`complete-${delivery.sale_id}`,detail.checklist_progress.mandatoryCompleted===10]);
    checks.push([`delivered-${delivery.sale_id}`,detail.sale_status==='delivered'&&detail.signatures.length===1]);
    continue;
  }
  if(detail.status==='planned')detail=(await call(`/deliveries/${id}/status`,{method:'PATCH',token,body:{status:'preparing'}})).data;
  checks.push([`snapshot-${delivery.sale_id}`,detail.checklist_progress.mandatoryTotal===10]);
  if(detail.status==='preparing')detail=(await call(`/deliveries/${id}/status`,{method:'PATCH',token,body:{status:'quality_control'}})).data;
  if(detail.checklist_progress.mandatoryCompleted<detail.checklist_progress.mandatoryTotal){
    checks.push([`premature-ready-${delivery.sale_id}`,(await call(`/deliveries/${id}/status`,{method:'PATCH',token,body:{status:'ready'},expected:[409]})).status===409]);
    detail=(await call(`/deliveries/${id}`,{token})).data;
    for(const item of detail.checklist)await call(`/deliveries/${id}/checklist/${item.id}`,{method:'PATCH',token,body:{completed:true,notes:'Contrôle ERP-06 conforme'}});
  }
  detail=(await call(`/deliveries/${id}`,{token})).data;
  if(!detail.documents.length)detail=(await call(`/deliveries/${id}/documents`,{method:'POST',token,body:{documentName:'Pièce remise client ERP-06',documentType:'handover-proof',fileName:`preuve-livraison-${delivery.sale_id}.png`,mimeType:'image/png',dataBase64:attachment,isRequired:true,received:false},expected:[201]})).data;
  if(detail.status==='quality_control')detail=(await call(`/deliveries/${id}/status`,{method:'PATCH',token,body:{status:'ready'}})).data;
  const document=detail.documents.find(item=>item.is_required&&!item.received);
  if(document){
    checks.push([`pending-document-blocks-sign-${delivery.sale_id}`,(await call(`/deliveries/${id}/sign`,{method:'POST',token,body:{signerName:detail.customer_name||'Client ERP-06',signatureData:signature,consentText:'Remise acceptée',mileageAtDelivery:Number(detail.vehicle_mileage)},expected:[409]})).status===409]);
    detail=(await call(`/deliveries/${id}/documents/${document.id}`,{method:'PATCH',token,body:{received:true}})).data;
  }
  checks.push([`complete-${delivery.sale_id}`,detail.checklist_progress.mandatoryCompleted===10&&detail.status==='ready']);
  checks.push([`direct-delivered-refused-${delivery.sale_id}`,(await call(`/deliveries/${id}/status`,{method:'PATCH',token,body:{status:'delivered'},expected:[409]})).status===409]);
  const signerName=detail.customer_name||`Client vente ${delivery.sale_id}`;
  checks.push([`bad-signature-${delivery.sale_id}`,(await call(`/deliveries/${id}/sign`,{method:'POST',token,body:{signerName,signatureData:'data:image/png;base64,AAAA',consentText:'Remise acceptée',mileageAtDelivery:Number(detail.vehicle_mileage)},expected:[400]})).status===400]);
  const mileage=Number(detail.vehicle_mileage)+1;
  detail=(await call(`/deliveries/${id}/sign`,{method:'POST',token,body:{signerName,signatureData:signature,consentText:'Je confirme la réception du véhicule et des documents.',mileageAtDelivery:mileage}})).data;
  checks.push([`delivered-${delivery.sale_id}`,detail.status==='delivered'&&detail.sale_status==='delivered'&&detail.signatures.length===1]);
  const duplicates=await Promise.all([call(`/deliveries/${id}/sign`,{method:'POST',token,body:{signerName,signatureData:signature,consentText:'Je confirme la réception du véhicule et des documents.',mileageAtDelivery:mileage}}),call(`/deliveries/${id}/sign`,{method:'POST',token,body:{signerName,signatureData:signature,consentText:'Je confirme la réception du véhicule et des documents.',mileageAtDelivery:mileage}})]);
  checks.push([`idempotent-sign-${delivery.sale_id}`,duplicates.every(result=>result.data.signatures.length===1)]);
}

await mkdir('/tmp/pdfs',{recursive:true});
for(const delivery of deliveries){const pdf=await call(`/deliveries/${delivery.id}/pdf`,{token,binary:true});await writeFile(`/tmp/pdfs/rec06-pv-sale${delivery.sale_id}.pdf`,pdf.data);checks.push([`pdf-${delivery.sale_id}`,pdf.headers['content-type']==='application/pdf'&&pdf.data.subarray(0,4).toString()==='%PDF']);}
const planning=await call(`/deliveries-planning/pdf?date=${planningDate}`,{token,binary:true});await writeFile('/tmp/pdfs/rec06-planning.pdf',planning.data);checks.push(['planning-pdf',planning.data.subarray(0,4).toString()==='%PDF']);

const profiles=['recette.commercial@lca-test.cg','recette.comptable@lca-test.cg','recette.direction@lca-test.cg','recette.responsable_livraison@lca-test.cg'];
const rbac=[];
for(const email of profiles){const session=await login(email,userPassword),list=await call('/deliveries',{token:session.data.accessToken,expected:[200,403]});rbac.push({email,status:list.status,count:Array.isArray(list.data)?list.data.length:null});}
rbac.push({email:'SUPER_ADMIN',status:(await call('/deliveries',{token:admin})).status});
const candidatesAfter=(await call('/deliveries/candidates',{token})).data;
checks.push(['candidates-consumed',!candidatesAfter.some(item=>['2','5'].includes(String(item.sale_id)))]);
const finalDeliveries=[];
for(const delivery of deliveries)finalDeliveries.push((await call(`/deliveries/${delivery.id}`,{token})).data);
const failed=checks.filter(([,ok])=>!ok);
const result={generatedAt:new Date().toISOString(),base,planningDate,specialist:{id:String(specialist.id),email:deliveryEmail,agencyId:String(specialist.agency_id??specialist.agencyId??2)},deliveryIds:finalDeliveries.map(item=>String(item.id)),deliveries:finalDeliveries.map(item=>({id:String(item.id),saleId:String(item.sale_id),number:item.delivery_number,status:item.status,saleStatus:item.sale_status,vehicleId:String(item.vehicle_id),vehicleMileage:Number(item.vehicle_mileage),mileageAtDelivery:Number(item.mileage_at_delivery),checklist:item.checklist_progress,documents:item.documents.length,signatures:item.signatures.length,financiallyCleared:item.financially_cleared,financialAuthorization:item.financial_authorization?.status??null})),rbac,checks:checks.map(([name,ok])=>({name,ok})),failed,timing:{count:timings.length,maxMs:Math.max(...timings.map(item=>item.ms)),averageMs:Math.round(timings.reduce((sum,item)=>sum+item.ms,0)/timings.length*100)/100},timings};
await writeFile('/tmp/stabilisation-erp-06-result.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(failed.length)process.exitCode=1;
