import {generate} from 'otplib';

const base=process.env.FIN_E2E_API_URL??'http://127.0.0.1:3005/api';
const email=process.env.FIN_E2E_ADMIN_EMAIL;
const password=process.env.FIN_E2E_ADMIN_PASSWORD;
const totpSecret=process.env.FIN_E2E_TOTP_SECRET;
if(!email||!password||!totpSecret)throw new Error('FIN_E2E_ADMIN_EMAIL, FIN_E2E_ADMIN_PASSWORD et FIN_E2E_TOTP_SECRET sont requis');

const json=async(path,options={})=>{
  const response=await fetch(`${base}${path}`,{...options,headers:{'Content-Type':'application/json',...(options.headers??{})}});
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(`${options.method??'GET'} ${path}: ${response.status} ${JSON.stringify(body)}`);
  return body;
};
const login=await json('/auth/login',{method:'POST',body:JSON.stringify({email,password})});
if(login.status!=='two_factor_required')throw new Error(`Connexion inattendue: ${JSON.stringify(login)}`);
const verified=await json('/auth/2fa/verify',{method:'POST',body:JSON.stringify({challengeToken:login.challengeToken,code:await generate({secret:totpSecret})})});
const token=verified.accessToken;
const auth=(path,options={})=>json(path,{...options,headers:{Authorization:`Bearer ${token}`,...(options.headers??{})}});

const agencies=await auth('/settings/agencies');
let second=agencies.find(x=>x.code==='LCA-PNR');
if(!second){const created=await auth('/agencies',{method:'POST',body:JSON.stringify({name:'Agence financière Pointe-Noire',code:'LCA-PNR',city:'Pointe-Noire',email:'agence.pnr@lca.test'})});second={id:String(created.agencyId),code:'LCA-PNR',name:'Agence financière Pointe-Noire'}}
const primary=agencies.find(x=>x.code==='LCA-BZV');
if(!primary)throw new Error('Agence principale LCA-BZV introuvable');

const catalog=await auth('/permissions');
const permissionByCode=new Map(catalog.map(x=>[x.code,String(x.id)]));
const profiles={
  FIN_RESP_FACTURATION:['billing.invoice.view','billing.invoice.create','billing.invoice.update','billing.invoice.issue','billing.invoice.cancel','billing.payment.view','billing.export'],
  FIN_AGENT_FACTURATION:['billing.invoice.view','billing.invoice.create','billing.invoice.update'],
  FIN_AGENT_ENCAISSEMENT:['billing.invoice.view','billing.payment.view','billing.payment.collect','billing.payment.cancel','billing.payment.refund','ged.view'],
  FIN_COMPTABLE:['accounting.entry.view','accounting.entry.create','accounting.entry.validate','accounting.entry.post','accounting.entry.reverse','accounting.entry.export','accounting.ledger.view','accounting.control.view','accounting.statement.view','accounting.integration.view','accounting.integration.retry','accounting.scheme.view','accounting.chart.view','accounting.fiscal.view','accounting.journal.view','accounting.mapping.view'],
  FIN_RESP_TRESORERIE:['treasury.view','treasury.account.manage','treasury.category.manage','treasury.receipt.create','treasury.disbursement.create','treasury.transfer.create','treasury.reverse','treasury.reconciliation.view','treasury.reconciliation.import','treasury.reconciliation.validate_import','treasury.reconciliation.reconcile','treasury.reconciliation.cancel','treasury.reconciliation.export','reporting.view','reporting.export'],
  FIN_SANS_PERMISSION:[],
};
const labels={FIN_RESP_FACTURATION:'Responsable facturation',FIN_AGENT_FACTURATION:'Agent de facturation',FIN_AGENT_ENCAISSEMENT:'Agent d’encaissement',FIN_COMPTABLE:'Comptable',FIN_RESP_TRESORERIE:'Responsable trésorerie',FIN_SANS_PERMISSION:'Utilisateur sans permission'};
const existingRoles=await auth('/roles');
const roles={};
for(const[code,codes]of Object.entries(profiles)){
  let role=existingRoles.find(x=>x.code===code);
  const permissions=codes.map(permissionCode=>{const permissionId=permissionByCode.get(permissionCode);if(!permissionId)throw new Error(`Permission absente: ${permissionCode}`);return{permissionId,scope:'AGENCY'}});
  if(!role)role=await auth('/roles',{method:'POST',body:JSON.stringify({code,name:labels[code],description:'Profil de recette financière isolée',permissions})});
  roles[code]=String(role.id);
}

const users=await auth('/users');
const definitions=[
  ['resp.facturation@lca.test','Responsable','Facturation','FIN_RESP_FACTURATION'],
  ['agent.facturation@lca.test','Agent','Facturation','FIN_AGENT_FACTURATION'],
  ['agent.encaissement@lca.test','Agent','Encaissement','FIN_AGENT_ENCAISSEMENT'],
  ['comptable@lca.test','Camille','Comptable','FIN_COMPTABLE'],
  ['tresorerie@lca.test','Responsable','Trésorerie','FIN_RESP_TRESORERIE'],
  ['sans.permission@lca.test','Utilisateur','Sans droit','FIN_SANS_PERMISSION'],
];
const createdUsers={};
for(const[userEmail,firstName,lastName,roleCode]of definitions){
  let user=users.find(x=>x.email===userEmail);
  if(!user)user=await auth('/users',{method:'POST',body:JSON.stringify({firstName,lastName,email:userEmail,password:'Recette.Finance-2026!',agencyAssignments:[{agencyId:String(primary.id),roles:[roleCode],isPrimary:true},{agencyId:String(second.id),roles:[roleCode],isPrimary:false}]})});
  createdUsers[userEmail]=String(user.id);
}

const agencyIds=[String(primary.id),String(second.id)];
const existingAccounts=await auth('/treasury/accounts');
const accounts={};
for(const agency of [{id:String(primary.id),code:'BZV'},{id:String(second.id),code:'PNR'}]){
  const definitions=[
    [`FIN_${agency.code}_CAISSE`,`Caisse de recette ${agency.code}`,'CASH',500000],
    [`FIN_${agency.code}_BANQUE`,`Compte bancaire ${agency.code}`,'BANK',2500000],
  ];
  for(const[code,name,accountType,openingBalance]of definitions){
    let account=existingAccounts.find(x=>x.code===code);
    if(!account)account=await auth('/treasury/accounts',{method:'POST',body:JSON.stringify({
      code,name,description:'Compte de recette financière isolée',accountType,
      attachmentType:'AGENCY',agencyId:agency.id,openingBalance,
      openingDate:'2026-01-01',openingReference:`OUV-${code}`,
      openingJustification:'Solde d’ouverture de la recette financière isolée',
    })});
    accounts[code]=String(account.id);
  }
}

const existingCategories=await auth('/treasury/categories');
const categories={};
for(const definition of [
  ['FIN_RECETTES','Recettes diverses','IN'],
  ['FIN_DEPENSES','Dépenses diverses','OUT'],
  ['FIN_AJUSTEMENTS','Ajustements de trésorerie','BOTH'],
]){
  const[code,name,allowedDirection]=definition;
  let category=existingCategories.find(x=>x.code===code);
  if(!category)category=await auth('/treasury/categories',{method:'POST',body:JSON.stringify({code,name,description:'Catégorie de recette financière isolée',allowedDirection})});
  categories[code]=String(category.id);
}

const flowConfiguration=await auth('/treasury/flow-configuration');
const paymentMethods=flowConfiguration.paymentMethods;
for(const agencyId of agencyIds){
  for(const method of paymentMethods){
    const accountCode=String(method.code).toUpperCase().includes('CASH')?`FIN_${agencyId===String(primary.id)?'BZV':'PNR'}_CAISSE`:`FIN_${agencyId===String(primary.id)?'BZV':'PNR'}_BANQUE`;
    const already=flowConfiguration.mappings.find(x=>String(x.agency_id)===agencyId&&String(x.payment_method_id)===String(method.id)&&String(x.treasury_account_id)===accounts[accountCode]);
    if(!already)await auth('/treasury/flow-mappings',{method:'PUT',body:JSON.stringify({agencyId,paymentMethodId:String(method.id),treasuryAccountId:accounts[accountCode]})});
  }
}
if(!flowConfiguration.isReady)await auth('/treasury/flow-readiness',{method:'PATCH',body:JSON.stringify({isReady:true})});

let chart=await auth('/accounting/accounts?pageSize=100');
if(!chart.items.some(x=>x.number==='411')){
  await auth('/accounting/accounts/import',{method:'POST',body:JSON.stringify({rows:[
    {number:'4',label:'Comptes de tiers'},{number:'41',label:'Clients et comptes rattachés'},{number:'411',label:'Clients'},
    {number:'5',label:'Comptes de trésorerie'},{number:'52',label:'Banques'},{number:'521',label:'Banques locales'},{number:'57',label:'Caisse'},{number:'571',label:'Caisse agence'},
    {number:'7',label:'Comptes de produits'},{number:'70',label:'Ventes'},{number:'701',label:'Ventes de marchandises'},
  ]})});
  chart=await auth('/accounting/accounts?pageSize=100');
}
const accountingAccounts=Object.fromEntries(chart.items.map(x=>[x.number,String(x.id)]));
const fiscalRows=await auth('/accounting/fiscal-years');
const fiscalYears={};
for(const year of ['2025','2026']){
  let fiscal=fiscalRows.find(x=>x.code===`FIN-${year}`);
  if(!fiscal)fiscal=await auth('/accounting/fiscal-years',{method:'POST',body:JSON.stringify({code:`FIN-${year}`,name:`Exercice financier ${year}`,startDate:`${year}-01-01`,endDate:`${year}-12-31`})});
  fiscalYears[year]=String(fiscal.id);
  if(fiscal.status!=='OPEN')await auth(`/accounting/fiscal-years/${fiscal.id}/status`,{method:'PATCH',body:JSON.stringify({status:'OPEN'})});
}
const journalResponse=await auth('/accounting/journals?pageSize=100');
let salesJournal=journalResponse.items.find(x=>x.code==='VE');
if(!salesJournal)salesJournal=await auth('/accounting/journals',{method:'POST',body:JSON.stringify({code:'VE',name:'Journal des ventes et encaissements',journalType:'SALES'})});
const accountingMappings=await auth('/accounting/mappings');
for(const[code,treasuryAccountId]of Object.entries(accounts)){
  if(accountingMappings.some(x=>String(x.treasuryAccountId)===treasuryAccountId))continue;
  const accountingAccountId=code.endsWith('_CAISSE')?accountingAccounts['571']:accountingAccounts['521'];
  await auth('/accounting/mappings',{method:'POST',body:JSON.stringify({treasuryAccountId,accountingAccountId,effectiveFrom:'2025-01-01'})});
}
const schemeResponse=await auth('/accounting/schemes');
const schemeDefinitions=[
  ['INVOICE_ISSUED','Facture client émise',[['DEBIT','TOTAL','FIXED',accountingAccounts['411'],'Créance client'],['CREDIT','TOTAL','FIXED',accountingAccounts['701'],'Vente']]],
  ['CREDIT_NOTE_ISSUED','Avoir client émis',[['DEBIT','AMOUNT','FIXED',accountingAccounts['701'],'Annulation de vente'],['CREDIT','AMOUNT','FIXED',accountingAccounts['411'],'Réduction de créance']]],
  ['PAYMENT_CONFIRMED','Encaissement client confirmé',[['DEBIT','AMOUNT','TREASURY',null,'Compte financier'],['CREDIT','AMOUNT','FIXED',accountingAccounts['411'],'Créance client']]],
  ['PAYMENT_REFUNDED','Remboursement client',[['DEBIT','AMOUNT','FIXED',accountingAccounts['411'],'Dette envers le client'],['CREDIT','AMOUNT','TREASURY',null,'Compte financier']]],
];
const schemes={};
for(const[eventType,name,lines]of schemeDefinitions){
  let scheme=schemeResponse.items.find(x=>x.eventType===eventType&&x.status==='ACTIVE');
  if(!scheme)scheme=await auth('/accounting/schemes',{method:'POST',body:JSON.stringify({domainCode:'BILLING',eventType,name,journalId:String(salesJournal.id),effectiveFrom:'2025-01-01',lines:lines.map(([side,amountComponent,accountSource,accountId,label])=>({side,amountComponent,accountSource,accountId,label}))})});
  schemes[eventType]=String(scheme.id);
}

console.log(JSON.stringify({agencies:{primary:String(primary.id),secondary:String(second.id)},roles,users:createdUsers,accounts,categories,paymentMethods:paymentMethods.map(x=>({id:String(x.id),code:x.code,name:x.name})),flowReady:true,accounting:{accounts:accountingAccounts,fiscalYears,journal:String(salesJournal.id),schemes}},null,2));
