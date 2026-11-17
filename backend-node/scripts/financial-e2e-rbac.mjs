import {generate} from 'otplib';

const base=process.env.FIN_E2E_API_URL??'http://127.0.0.1:3005/api';
const adminEmail=process.env.FIN_E2E_ADMIN_EMAIL;
const adminPassword=process.env.FIN_E2E_ADMIN_PASSWORD;
const secret=process.env.FIN_E2E_TOTP_SECRET;
const userPassword=process.env.FIN_E2E_USER_PASSWORD??'Recette.Finance-2026!';
if(!adminEmail||!adminPassword||!secret)throw new Error('Identifiants administrateur FIN_E2E requis');

const raw=async(path,options={})=>{
  const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers??{})}});
  const body=await response.json().catch(()=>({}));
  return{status:response.status,body};
};
const required=async(path,options={})=>{const result=await raw(path,options);if(result.status<200||result.status>=300)throw new Error(`${options.method??'GET'} ${path}: ${result.status} ${JSON.stringify(result.body)}`);return result.body};
const login=async(email,password)=>{
  const result=await required('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
  if(result.accessToken)return result;
  if(result.status==='two_factor_required')return required('/auth/2fa/verify',{method:'POST',body:JSON.stringify({challengeToken:result.challengeToken,code:await generate({secret})})});
  throw new Error(`Connexion inattendue pour ${email}: ${JSON.stringify(result)}`);
};
let admin;
try{admin=await login(adminEmail,adminPassword)}catch(error){if(!String(error).includes('401'))throw error;await new Promise(resolve=>setTimeout(resolve,30000-Date.now()%30000+1000));admin=await login(adminEmail,adminPassword)}
const adminCall=(path,options={})=>required(path,{...options,headers:{Authorization:`Bearer ${admin.accessToken}`,...(options.headers??{})}});
const adminPut=(path,body)=>adminCall(path,{method:'PUT',body:JSON.stringify(body)});
const adminPost=(path,body)=>adminCall(path,{method:'POST',body:JSON.stringify(body)});
const adminPatch=(path,body)=>adminCall(path,{method:'PATCH',body:JSON.stringify(body)});
const adminDelete=path=>adminCall(path,{method:'DELETE'});

const agencies=await adminCall('/rbac/agencies');
const primary=agencies.agencies.find(x=>x.code==='LCA-BZV');
const secondary=agencies.agencies.find(x=>x.code==='LCA-PNR');
if(!primary||!secondary)throw new Error('Agences de recette absentes');
const users=await adminCall('/users');
const roles=await adminCall('/roles');
const agent=users.find(x=>x.email==='agent.facturation@lca.test');
const agentRole=roles.find(x=>x.code==='FIN_AGENT_FACTURATION');
const noPermissionRole=roles.find(x=>x.code==='FIN_SANS_PERMISSION');
if(!agent||!agentRole||!noPermissionRole)throw new Error('Profil RBAC de recette incomplet');

await adminPut('/rbac/agency-context',{agencyId:String(secondary.agencyId)});
let assignments=await adminCall(`/users/${agent.id}/agencies`);
const secondaryAssignment=assignments.find(x=>String(x.agencyId)===String(secondary.agencyId));
if(!secondaryAssignment)throw new Error('Affectation secondaire absente');
for(const role of secondaryAssignment.roles){
  if(String(role.id)!==String(noPermissionRole.id))await adminDelete(`/users/${agent.id}/agencies/${secondaryAssignment.id}/roles/${role.id}`);
}
assignments=await adminCall(`/users/${agent.id}/agencies`);
const currentSecondary=assignments.find(x=>String(x.id)===String(secondaryAssignment.id));
if(currentSecondary.status!=='ACTIVE')await adminPatch(`/users/${agent.id}/agencies/${secondaryAssignment.id}/status`,{isActive:true});
if(!currentSecondary.roles.some(x=>String(x.id)===String(noPermissionRole.id)))await adminPost(`/users/${agent.id}/agencies/${secondaryAssignment.id}/roles`,{roleId:String(noPermissionRole.id)});

const endpoints={billing:'/invoices',treasury:'/treasury/accounts',accounting:'/accounting/entries'};
const definitions=[
  ['resp.facturation@lca.test',{billing:200,treasury:403,accounting:403}],
  ['agent.facturation@lca.test',{billing:200,treasury:403,accounting:403}],
  ['agent.encaissement@lca.test',{billing:200,treasury:403,accounting:403}],
  ['comptable@lca.test',{billing:403,treasury:403,accounting:200}],
  ['tresorerie@lca.test',{billing:403,treasury:200,accounting:403}],
  ['sans.permission@lca.test',{billing:403,treasury:403,accounting:403}],
];
const checks=[];
for(const[email,expected]of definitions){
  const authenticated=await login(email,userPassword),headers={Authorization:`Bearer ${authenticated.accessToken}`};
  const context=await required('/rbac/agency-context',{headers});
  const observed={};
  for(const[key,path]of Object.entries(endpoints))observed[key]=(await raw(path,{headers})).status;
  for(const key of Object.keys(expected))if(observed[key]!==expected[key])throw new Error(`${email} ${key}: attendu ${expected[key]}, reçu ${observed[key]}`);
  checks.push({email,agencyId:context.activeAgencyId,roles:context.roles.map(x=>x.code),expected,observed});
}

const agentSession=await login('agent.facturation@lca.test',userPassword);
const agentHeaders={Authorization:`Bearer ${agentSession.accessToken}`};
const beforeSwitch=await required('/rbac/agency-context',{headers:agentHeaders});
const primaryInvoices=await required('/invoices',{headers:agentHeaders});
const switched=await required('/rbac/agency-context',{method:'PUT',headers:agentHeaders,body:JSON.stringify({agencyId:String(secondary.agencyId)})});
const secondaryBillingStatus=(await raw('/invoices',{headers:agentHeaders})).status;
if(secondaryBillingStatus!==403)throw new Error(`Le rôle secondaire sans permission devait produire 403, reçu ${secondaryBillingStatus}`);
if(!switched.roles.some(x=>x.code==='FIN_SANS_PERMISSION')||switched.permissions.length!==0)throw new Error('Le contexte secondaire ne reflète pas le rôle sans permission');

await adminPatch(`/users/${agent.id}/agencies/${secondaryAssignment.id}/status`,{isActive:false});
const afterRevocation=await raw('/rbac/agency-context',{headers:agentHeaders});
const revokedSelection=await raw('/rbac/agency-context',{method:'PUT',headers:agentHeaders,body:JSON.stringify({agencyId:String(secondary.agencyId)})});
if(afterRevocation.status!==200||String(afterRevocation.body.activeAgencyId)!==String(primary.agencyId))throw new Error(`La session devait revenir sur l’agence principale après révocation: ${afterRevocation.status} ${JSON.stringify(afterRevocation.body)}`);
if(revokedSelection.status<400)throw new Error(`L’agence révoquée ne devait plus être sélectionnable, reçu ${revokedSelection.status}`);
await adminPatch(`/users/${agent.id}/agencies/${secondaryAssignment.id}/status`,{isActive:true});

const finalAssignments=await adminCall(`/users/${agent.id}/agencies`);
const finalSecondary=finalAssignments.find(x=>String(x.id)===String(secondaryAssignment.id));
const invoiceItems=Array.isArray(primaryInvoices)?primaryInvoices:primaryInvoices.items??primaryInvoices.data??[];
console.log(JSON.stringify({
  profiles:checks,
  multiAgency:{userId:String(agent.id),before:{agencyId:beforeSwitch.activeAgencyId,roles:beforeSwitch.roles.map(x=>x.code),visibleInvoices:invoiceItems.length},after:{agencyId:switched.activeAgencyId,roles:switched.roles.map(x=>x.code),permissions:switched.permissions.length,billingStatus:secondaryBillingStatus}},
  assignments:finalAssignments.map(x=>({agencyId:x.agencyId,agencyCode:x.agencyCode,status:x.status,roles:x.roles.map(role=>role.code)})),
  revocation:{contextStatus:afterRevocation.status,fallbackAgencyId:afterRevocation.body.activeAgencyId,revokedSelectionStatus:revokedSelection.status,reactivated:finalSecondary.status==='ACTIVE'},
},null,2));
