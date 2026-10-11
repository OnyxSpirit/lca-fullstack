const base=process.env.RECETTE_API_URL??'http://127.0.0.1:3004/api';
const adminEmail=process.env.ADMIN_EMAIL,adminPassword=process.env.ADMIN_PASSWORD,userPassword=process.env.RECETTE_USER_PASSWORD;
if(!adminEmail||!adminPassword||!userPassword)throw new Error('Variables de recette manquantes');
const timings=[],checks=[];
async function call(path,{method='GET',token,body,expected=[200]}={}){const start=performance.now(),response=await fetch(base+path,{method,headers:{...(token?{authorization:`Bearer ${token}`} :{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}),raw=await response.text();let data;try{data=raw?JSON.parse(raw):null}catch{data={raw:raw.slice(0,200)}}const ms=Math.round((performance.now()-start)*100)/100;timings.push({method,path,status:response.status,ms});if(!expected.includes(response.status))throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);return{status:response.status,data,ms};}
const login=async(email,password=userPassword)=>call('/auth/login',{method:'POST',body:{email,password}});
const admin=(await login(adminEmail,adminPassword)).data.accessToken;
const users=(await call('/users',{token:admin})).data,agencies=(await call('/agencies',{token:admin})).data;
const byRole=code=>users.find(u=>u.roles?.some?.(r=>r.code===code)||u.role?.code===code||u.roleCode===code);
const commercial=users.find(u=>u.email==='recette.commercial@lca-test.cg'),manager=users.find(u=>u.email==='recette.responsable_commercial@lca-test.cg'),reception=users.find(u=>u.email==='recette.receptionniste@lca-test.cg');
if(!commercial||!manager||!reception)throw new Error('Comptes STABILISATION-ERP-02 absents');
const tokens={commercial:(await login(commercial.email)).data.accessToken,manager:(await login(manager.email)).data.accessToken,reception:(await login(reception.email)).data.accessToken};
const current=(await call('/leads?search=REC03-&page=1&pageSize=100',{token:admin})).data.items??[];
async function ensureLead(spec){let lead=current.find(x=>x.title===spec.title);if(!lead)lead=(await call('/leads',{method:'POST',token:admin,body:spec,expected:[201]})).data;return lead;}
const leadSpecs=[
 {title:'REC03-Particulier budget SUV',prospectType:'individual',firstName:'Élodie-Anne',lastName:'Mavoungou',email:'rec03.elodie@example.test',phone:'+242 06 100 0301',source:'Web',priority:'high',assignedUserId:String(commercial.id),expectedValue:28000000,probability:35,notes:'REC03- besoin SUV familial, reprise à étudier'},
 {title:'REC03-Entreprise flotte',prospectType:'company',companyName:'REC03 Transports & Fils',email:'rec03.flotte@example.test',phone:'+242 06 100 0302',source:'Campagne Marketing',priority:'urgent',assignedUserId:String(manager.id),expectedValue:85000000,probability:50,notes:'REC03- flotte de trois véhicules'},
 {title:'REC03-Sans budget',prospectType:'individual',firstName:'Jean-Paul',lastName:'Nzé',email:'rec03.sansbudget@example.test',source:'Téléphone',priority:'low',assignedUserId:String(commercial.id),notes:'REC03- budget non défini'},
 {title:'REC03-Perdu concurrence',prospectType:'individual',firstName:'Aïcha',lastName:'M’Bemba',phone:'+242 06 100 0304',source:'Passage Showroom',priority:'medium',assignedUserId:String(manager.id),expectedValue:19000000,probability:20},
 {title:'REC03-Affectation manager',prospectType:'company',companyName:'REC03 Industrie Congo',email:'rec03.industrie@example.test',source:'Parrainage',priority:'medium',assignedUserId:String(manager.id),expectedValue:42000000,probability:40},
];
const leads=[];for(const spec of leadSpecs)leads.push(await ensureLead(spec));
// Validations d'entrée et doublons détectables, sans imposer une unicité métier aux leads.
checks.push(['invalid-email',(await call('/leads',{method:'POST',token:admin,body:{title:'REC03-Invalide',prospectType:'individual',firstName:'Test',lastName:'Invalide',email:'invalide'},expected:[400]})).status]);
checks.push(['missing-contact',(await call('/leads',{method:'POST',token:admin,body:{title:'REC03-Sans contact',prospectType:'individual',firstName:'Test',lastName:'SansContact'},expected:[400]})).status]);
const duplicates=(await call('/leads/duplicates?email=rec03.elodie%40example.test',{token:admin})).data;checks.push(['lead-duplicate-search',duplicates.length]);
// Modification, pipeline autorisé/interdit, perte et activités.
await call(`/leads/${leads[0].id}`,{method:'PATCH',token:admin,body:{notes:'REC03- besoin SUV familial — reprise véhicule 2018',probability:45}});
if(leads[0].stage==='new')await call(`/leads/${leads[0].id}/stage`,{method:'PATCH',token:admin,body:{stage:'contacted'}});
if(['new','contacted'].includes(leads[0].stage))await call(`/leads/${leads[0].id}/stage`,{method:'PATCH',token:admin,body:{stage:'qualified'}});
checks.push(['forbidden-transition',(await call(`/leads/${leads[2].id}/stage`,{method:'PATCH',token:admin,body:{stage:'qualified'},expected:[409]})).status]);
if(leads[3].stage!=='lost')await call(`/leads/${leads[3].id}/stage`,{method:'PATCH',token:admin,body:{stage:'lost',lostReason:'Choix d’un concurrent'}});
const activity=(await call('/activities',{method:'POST',token:admin,body:{leadId:String(leads[0].id),type:'call',status:'completed',subject:'REC03-Appel qualification',description:'Besoin, budget et reprise confirmés'},expected:[201]})).data;
const scheduledAt=new Date(Date.now()+3*86400000);scheduledAt.setUTCHours(9,0,0,0);
const appointment=leads[0].stage==='appointment'?{id:null}:((await call(`/leads/${leads[0].id}/appointments`,{method:'POST',token:admin,body:{scheduledAt:scheduledAt.toISOString(),durationMinutes:45,subject:'REC03-Rendez-vous essai'},expected:[201]})).data);
checks.push(['appointment-conflict',(await call(`/leads/${leads[0].id}/appointments`,{method:'POST',token:admin,body:{scheduledAt:scheduledAt.toISOString(),durationMinutes:45,subject:'REC03-Conflit'},expected:[201,409]})).status]);
const activities=(await call(`/leads/${leads[0].id}/activities`,{token:admin})).data;
// Réaffectation aller-retour et portée OWN.
await call(`/leads/${leads[4].id}`,{method:'PATCH',token:admin,body:{assignedUserId:String(commercial.id)}});
await call(`/leads/${leads[4].id}`,{method:'PATCH',token:admin,body:{assignedUserId:String(manager.id)}});
const commercialList=(await call('/leads?search=REC03-&page=1&pageSize=100',{token:tokens.commercial})).data.items??[];
const managerList=(await call('/leads?search=REC03-&page=1&pageSize=100',{token:tokens.manager})).data.items??[];
checks.push(['commercial-other-direct',(await call(`/leads/${leads[1].id}`,{token:tokens.commercial,expected:[404]})).status]);
checks.push(['reception-crm',(await call('/leads',{token:tokens.reception,expected:[403]})).status]);
const team=(await call('/crm/team-members',{token:tokens.manager})).data;
// Clients 360 particuliers/entreprises, doublon, recherche, contact et scope.
const existingCustomers=(await call('/customers?search=REC03-',{token:admin})).data;
async function ensureCustomer(spec,token){let row=existingCustomers.find(x=>x.email===spec.email);if(!row)row=(await call('/customers',{method:'POST',token,body:spec,expected:[201]})).data;return row;}
const customerA=await ensureCustomer({customerType:'individual',civility:'Mme',firstName:'Élodie-Anne',lastName:'Mavoungou',email:'rec03.client.elodie@example.test',phone:'+242 06 200 0301',city:'Brazzaville',classification:'vip',source:'CRM',notes:'REC03- prêt pour parcours vente'},tokens.commercial);
const customerB=await ensureCustomer({customerType:'company',companyName:'REC03 Transports & Fils Client',email:'rec03.client.flotte@example.test',phone:'+242 06 200 0302',city:'Pointe-Noire',classification:'regular',source:'CRM',notes:'REC03- dossier flotte prêt'},tokens.manager);
checks.push(['customer-duplicate-create',(await call('/customers',{method:'POST',token:tokens.commercial,body:{customerType:'individual',lastName:'Doublon',email:customerA.email},expected:[409]})).status]);
const duplicateCustomers=(await call(`/customers/duplicates?email=${encodeURIComponent(customerA.email)}`,{token:admin})).data;
const contact=(await call(`/customers/${customerB.id}/contacts`,{method:'POST',token:tokens.manager,body:{firstName:'Grâce',lastName:'Kimbembe',roleTitle:'Gestionnaire de flotte',email:'rec03.contact@example.test',phone:'+242 06 200 0399',isPrimary:true},expected:[201]})).data;
await call(`/customers/${customerB.id}/contacts/${contact.id}`,{method:'PATCH',token:tokens.manager,body:{roleTitle:'Responsable de flotte'}});
await call(`/customers/${customerA.id}`,{method:'PATCH',token:tokens.commercial,body:{secondaryPhone:'+242 05 200 0301',score:88}});
const customerSearch=(await call('/customers?search=%C3%89lodie-Anne',{token:admin})).data;
const customer360=(await call(`/customers/${customerA.id}/360`,{token:admin})).data;
checks.push(['commercial-other-customer',(await call(`/customers/${customerB.id}`,{token:tokens.commercial,expected:[404]})).status]);
// Notifications réelles du destinataire commercial.
const notificationResponse=await call('/notifications?page=1&pageSize=100&scope=mine',{token:tokens.commercial,expected:[200,403]});
const unreadResponse=await call('/notifications/unread-count',{token:tokens.commercial,expected:[200,403]});
const notifications=notificationResponse.status===200?notificationResponse.data:{items:[]},unread=unreadResponse.status===200?unreadResponse.data:{unreadCount:null};
// Concurrence : double création client même identité et deux modifications de prospect.
const unique=`rec03.concurrent.${Date.now()}@example.test`;
const concurrentCreates=await Promise.all([1,2].map(n=>call('/customers',{method:'POST',token:tokens.commercial,body:{customerType:'individual',firstName:'Concurrent',lastName:`REC03-${n}`,email:unique},expected:[201,409]})));
const concurrentUpdates=await Promise.all([call(`/leads/${leads[2].id}`,{method:'PATCH',token:admin,body:{notes:'REC03-concurrence A'}}),call(`/leads/${leads[2].id}`,{method:'PATCH',token:admin,body:{priority:'high'}})]);
const afterConcurrent=(await call(`/leads/${leads[2].id}`,{token:admin})).data;
// Échantillon performance supplémentaire.
for(let i=0;i<12;i++){await call('/leads?search=REC03-&page=1&pageSize=20',{token:admin});await call('/customers?search=REC03-',{token:admin});}
const sorted=timings.map(x=>x.ms).sort((a,b)=>a-b),percentile=p=>sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*p)-1)],avg=sorted.reduce((a,b)=>a+b,0)/sorted.length;
console.log(JSON.stringify({generatedAt:new Date().toISOString(),ids:{leads:leads.map(x=>({id:x.id,title:x.title,assignedUserId:x.assignedUserId,agencyId:x.agencyId})),customers:[{id:customerA.id,code:customerA.customerCode},{id:customerB.id,code:customerB.customerCode}],activityId:activity.id,appointmentId:appointment.id,contactId:contact.id},counts:{leads:leads.length,commercialVisible:commercialList.length,managerVisible:managerList.length,teamMembers:team.length,activities:activities.length,leadDuplicates:duplicates.length,customerDuplicates:duplicateCustomers.length,customerSearch:customerSearch.length,notifications:notifications.items.length,unread:unread.unreadCount},notificationAccess:notificationResponse.status,customer360:{sections:customer360.sections,timeline:customer360.timeline?.items?.length??customer360.timeline?.length??0},concurrency:{customerStatuses:concurrentCreates.map(x=>x.status),leadStatuses:concurrentUpdates.map(x=>x.status),after:{notes:afterConcurrent.notes,priority:afterConcurrent.priority}},checks,performance:{calls:timings.length,averageMs:Math.round(avg*100)/100,medianMs:percentile(.5),p95Ms:percentile(.95),maxMs:sorted.at(-1),errors:timings.filter(x=>x.status>=500).length},timings},null,2));
