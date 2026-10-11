const base=process.env.RECETTE_API_URL??'http://127.0.0.1:3004/api';
const adminEmail=process.env.ADMIN_EMAIL,adminPassword=process.env.ADMIN_PASSWORD,userPassword=process.env.RECETTE_USER_PASSWORD;
if(!adminEmail||!adminPassword||!userPassword)throw new Error('Variables de recette manquantes');
const timings=[];
async function call(path,{method='GET',token,body,expected=[200]}={}){const start=performance.now(),response=await fetch(base+path,{method,headers:{...(body?{'content-type':'application/json'}:{}),...(token?{authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined});const elapsed=Math.round((performance.now()-start)*100)/100,text=await response.text();let data;try{data=text?JSON.parse(text):null}catch{data={raw:text.slice(0,200)}}timings.push({method,path,status:response.status,ms:elapsed});if(!expected.includes(response.status))throw new Error(`${method} ${path}: ${response.status} ${JSON.stringify(data)}`);return{status:response.status,data};}
const login=(email,password,expected=[200])=>call('/auth/login',{method:'POST',body:{email,password},expected});
const auth=(await login(adminEmail,adminPassword)).data,token=auth.accessToken;
const catalog=(await call('/permissions',{token})).data,permissionByCode=new Map(catalog.map(p=>[p.code,p]));
const initialRoles=(await call('/roles',{token})).data;
const initialSystemRoles=initialRoles.filter(r=>r.is_system);
if(initialSystemRoles.length!==1||initialSystemRoles[0].code!=='SUPER_ADMIN')throw new Error(`Rôles système initiaux inattendus: ${JSON.stringify(initialSystemRoles)}`);
const agencies=(await call('/agencies',{token})).data;
for(const spec of[
  {code:'REC01-A2',name:'Agence Recette Nord',city:'Brazzaville'},
  {code:'REC01-A3',name:'Agence Recette Sud',city:'Pointe-Noire'},
  {code:'REC01-A4',name:'Agence Recette Support',city:'Dolisie'},
])if(!agencies.some(a=>a.code===spec.code))await call('/agencies',{method:'POST',token,body:spec,expected:[201]});
const agencyRows=(await call('/agencies',{token})).data,agencyByCode=new Map(agencyRows.map(a=>[a.code,a]));
const prefixes=(...values)=>code=>values.some(v=>code===v||code.startsWith(v+'.'));
const profiles=[
 ['DIRECTION','Direction','CONCESSION',prefixes('dashboard','reporting','activity','billing.view','billing.invoice.view','billing.payment.view','treasury.view','hr.view','hr.reporting.view')],
 ['RESPONSABLE_COMMERCIAL','Responsable commercial','CONCESSION',prefixes('dashboard','crm','showroom','quotations','sales','customers','vehicles.view','reporting.view')],
 ['COMMERCIAL','Commercial','OWN',prefixes('dashboard','crm','showroom','quotations','sales','customers.view','customers.create','customers.update','vehicles.view')],
 ['RECEPTIONNISTE','Réceptionniste','AGENCY',prefixes('dashboard','showroom','customers.view','customers.create','customers.update','vehicles.view')],
 ['COMPTABLE','Comptable','CONCESSION',prefixes('dashboard','billing','supplier.debt.view','supplier.invoice.view','supplier.invoice.history.view','reporting.export')],
 ['RESPONSABLE_FINANCIER','Responsable financier','CONCESSION',prefixes('dashboard','billing','treasury','supplier','delivery.financial_override.authorize','hr.budget','hr.expense','reporting')],
 ['RESPONSABLE_LIVRAISON','Responsable livraison','AGENCY',prefixes('dashboard','delivery','sales.view','vehicles.view','customers.view','stamp.view','stamp.use','document.signature.apply')],
 ['CONSEILLER_SAV','Conseiller SAV','OWN',prefixes('dashboard','service','customers.view','vehicles.view','workshop.vehicles.view','workshop.external_vehicle.create','workshop.vehicle.associations','ged')],
 ['RESPONSABLE_SAV','Responsable SAV','CONCESSION',prefixes('dashboard','service','workshop.view','workshop.productivity.view','customers.view','vehicles.view','ged','reporting.view')],
 ['CHEF_ATELIER','Chef atelier','AGENCY',prefixes('dashboard','workshop','service.order.view','service.order.assign_technician','service.order.advance','parts.reservation.view')],
 ['TECHNICIEN','Technicien','OWN',prefixes('dashboard','workshop.intervention','workshop.session','workshop.time.view','service.order.view')],
 ['MAGASINIER','Magasinier','AGENCY',prefixes('dashboard','parts')],
 ['RESPONSABLE_PIECES','Responsable pièces','CONCESSION',prefixes('dashboard','parts','supplier.invoice.view','supplier.invoice.history.view','supplier.debt.view','reporting.view')],
 ['RESPONSABLE_RH','Responsable RH','CONCESSION',prefixes('dashboard','hr','users.view','activity.view','reporting.view')],
 ['GESTIONNAIRE_RH','Gestionnaire RH','AGENCY',prefixes('dashboard','hr.view','hr.employees','hr.contract','hr.leave','hr.bonus','hr.salary.view')],
];
let roles=(await call('/roles',{token})).data;
for(const[code,name,scope,predicate]of profiles){const permissions=catalog.filter(p=>predicate(p.code)).map(p=>({permissionId:String(p.id),scope}));if(!permissions.length)throw new Error(`Aucune permission pour ${code}`);if(!roles.some(r=>r.code===code))await call('/roles',{method:'POST',token,body:{code,name,description:`Profil dynamique de recette ${code}`,permissions},expected:[201]});}
roles=(await call('/roles',{token})).data;
const roleByCode=new Map(roles.map(r=>[r.code,r]));
const businessRoleDetails=new Map();
for(const[code]of profiles){const role=roleByCode.get(code);businessRoleDetails.set(code,(await call(`/roles/${role.id}/permissions`,{token})).data);}
const agencyCycle=['LCA-BZV','REC01-A2','REC01-A3','REC01-A4'];
let users=(await call('/users',{token})).data;
for(let index=0;index<profiles.length;index++){const[code,name]=profiles[index],email=`recette.${code.toLowerCase()}@lca-test.cg`,agency=agencyByCode.get(agencyCycle[index%agencyCycle.length]);if(!agency)throw new Error(`Agence absente ${agencyCycle[index%agencyCycle.length]}`);if(!users.some(u=>u.email===email))await call('/users',{method:'POST',token,body:{firstName:'Recette',lastName:name,email,password:userPassword,jobTitle:name,agencyId:String(agency.id),roleCode:code},expected:[201]});}
users=(await call('/users',{token})).data;
// Vérification connexion, profil effectif et refus d’administration pour chaque rôle métier.
const access=[];
for(const[code]of profiles){const email=`recette.${code.toLowerCase()}@lca-test.cg`,session=await login(email,userPassword),me=await call('/auth/me',{token:session.data.accessToken}),denied=await call('/roles',{token:session.data.accessToken,expected:[403]});access.push({code,login:session.status,role:me.data.user.role.code,adminDenied:denied.status,permissions:me.data.user.permissions.length});}
// Modification/revocation/rechargement sur un rôle sans utilisateur critique, puis restauration.
const direction=roleByCode.get('DIRECTION'),directionDetail=businessRoleDetails.get('DIRECTION'),directionAssignments=directionDetail.permissions.map(p=>({permissionId:String(p.id),scope:p.scope}));
await call(`/roles/${direction.id}`,{method:'PATCH',token,body:{name:'Super Administrateur Recette',description:'Nom trompeur sans privilège système',permissions:directionAssignments}});
const renamedLogin=await login('recette.direction@lca-test.cg',userPassword),renamedDenied=await call('/roles',{token:renamedLogin.data.accessToken,expected:[403]});
await call(`/roles/${direction.id}`,{method:'PATCH',token,body:{name:'Direction',description:'Profil dynamique de recette DIRECTION',permissions:directionAssignments}});
// Protection du dernier Super Admin et refus sans authentification.
const noAuth=await call('/users',{expected:[401]}),selfDisable=await call(`/users/${auth.user.id}/status`,{method:'PATCH',token,body:{isActive:false},expected:[409]}),systemRole=roleByCode.get('SUPER_ADMIN'),systemEdit=await call(`/roles/${systemRole.id}`,{method:'PATCH',token,body:{name:'Interdit'},expected:[403]});
// Cycle désactivation/réactivation d’un utilisateur et invalidation immédiate.
const technician=users.find(u=>u.email==='recette.technicien@lca-test.cg'),techSession=await login(technician.email,userPassword);
await call(`/users/${technician.id}/status`,{method:'PATCH',token,body:{isActive:false}});const disabledLogin=await login(technician.email,userPassword,[401]);const disabledSession=await call('/auth/me',{token:techSession.data.accessToken,expected:[401]});await call(`/users/${technician.id}/status`,{method:'PATCH',token,body:{isActive:true}});
const result={generatedAt:new Date().toISOString(),initialSystemRoles:initialSystemRoles.map(r=>r.code),permissionCatalogCount:catalog.length,agencyCount:agencyRows.length,roleCount:roles.length,businessRoleCount:profiles.length,userCount:users.length,createdBusinessUsers:profiles.length,rolePermissionAssignments:[...businessRoleDetails.values()].reduce((sum,detail)=>sum+detail.permissions.length,0),access,noAuth:noAuth.status,lastSuperAdminProtection:selfDisable.status,systemRoleProtection:systemEdit.status,renamedRoleAdminDenied:renamedDenied.status,disabledLogin:disabledLogin.status,disabledExistingSession:disabledSession.status,timings};
console.log(JSON.stringify(result,null,2));
