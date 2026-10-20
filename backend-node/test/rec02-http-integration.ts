import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {lookup} from 'node:dns/promises';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {test} from 'node:test';

/**
 * REC-02.3 real HTTP harness (explicit execution only).
 *
 * This file deliberately registers no tests unless REC02_HTTP_TEST=1. Secrets
 * are accepted only through the process environment and are never printed.
 * The harness talks to the public frontend proxy, never to a test-only route.
 */

const enabled=process.env.REC02_HTTP_TEST==='1';
const run=promisify(execFile);
const dockerServices=new Set(['frontend','backend']);
const privateAddress=(address:string)=>address==='127.0.0.1'||address==='::1'||address.startsWith('10.')||address.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(address);

async function localBaseUrl(){
  const base=new URL(process.env.REC02_HTTP_BASE_URL??'http://127.0.0.1');
  assert.equal(base.protocol,'http:','REC02_HTTP_BASE_URL doit utiliser HTTP local');
  assert.equal(base.username,'','Identifiants interdits dans REC02_HTTP_BASE_URL');
  assert.equal(base.password,'','Identifiants interdits dans REC02_HTTP_BASE_URL');
  assert.equal(base.pathname,'/','REC02_HTTP_BASE_URL ne doit pas contenir de chemin');
  const dockerAllowed=process.env.REC02_HTTP_ALLOW_DOCKER_SERVICE==='1'&&dockerServices.has(base.hostname);
  assert.ok(['localhost','127.0.0.1','::1'].includes(base.hostname)||dockerAllowed,'Cible HTTP REC02 non locale refusée');
  const addresses=await lookup(base.hostname,{all:true,verbatim:true});
  assert.ok(addresses.length>0&&addresses.every(x=>privateAddress(x.address)),'Résolution DNS REC02 non locale refusée');
  return base;
}

type Json=Record<string,unknown>;
type Session={accessToken:string;refreshToken:string;user:Json};

async function request(base:URL,path:string,init:RequestInit={}){
  const url=new URL(path,base);
  assert.equal(url.origin,base.origin,'Changement d’origine HTTP interdit');
  const response=await fetch(url,{...init,redirect:'manual',headers:{accept:'application/json',...(init.headers??{})}});
  assert.ok(response.status<300||response.status>=400,'Redirection HTTP refusée par le harnais REC02');
  assert.equal(new URL(response.url).origin,base.origin,'Réponse issue d’une origine inattendue');
  return response;
}

async function json(response:Response):Promise<Json>{
  const type=response.headers.get('content-type')??'';
  assert.match(type,/application\/json/i,`Réponse HTTP ${response.status} non JSON`);
  return await response.json() as Json;
}

function secret(name:string){
  const value=process.env[name]??process.env.REC02_SHARED_PASSWORD;
  assert.ok(value&&value.length>=8,`${name} doit être injecté uniquement dans l’environnement du processus`);
  return value;
}

async function login(base:URL,prefix:string):Promise<Session>{
  const email=process.env[`${prefix}_EMAIL`]?.trim();
  assert.ok(email,`${prefix}_EMAIL requis`);
  const response=await request(base,'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:secret(`${prefix}_PASSWORD`)})});
  assert.equal(response.status,200,`Échec de l’authentification officielle ${prefix}: HTTP ${response.status}`);
  const body=await json(response);
  assert.equal(body.status,'authenticated',`${prefix} exige une étape 2FA interactive non prise en charge par ce harnais`);
  assert.equal(typeof body.accessToken,'string',`Jeton d’accès absent pour ${prefix}`);
  assert.equal(typeof body.refreshToken,'string',`Jeton de renouvellement absent pour ${prefix}`);
  assert.equal(typeof body.user,'object',`Profil absent pour ${prefix}`);
  return{accessToken:String(body.accessToken),refreshToken:String(body.refreshToken),user:body.user as Json};
}

const auth=(session:Session)=>({authorization:`Bearer ${session.accessToken}`,'content-type':'application/json'});
const numeric=(name:string)=>{const value=process.env[name]??'';assert.match(value,/^[1-9]\d*$/,`${name} doit être un identifiant numérique`);return value};
const required=(name:string)=>{const value=process.env[name]?.trim();assert.ok(value,`${name} requis`);return value};

async function mysqlScalar(sql:string){
  assert.match(sql,/^SELECT /i,'Le harnais REC02 autorise uniquement les lectures SQL');
  const command=`MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot --batch --raw --skip-column-names concession_erp -e "$REC02_SQL"`;
  const result=await run('docker',['compose','-p','lca','exec','-T','-e',`REC02_SQL=${sql}`,'mysql','sh','-lc',command],{cwd:new URL('../..',import.meta.url),maxBuffer:1024*1024});
  return result.stdout.trim();
}

function disbursementPayload(prefix:string,key:string,amount:number){
  return{
    instrumentId:numeric(`${prefix}_INSTRUMENT_ID`),
    accountId:numeric(`${prefix}_ACCOUNT_ID`),
    categoryId:numeric(`${prefix}_CATEGORY_ID`),
    paymentMethodId:numeric(`${prefix}_PAYMENT_METHOD_ID`),
    amount,
    valueDate:required(`${prefix}_VALUE_DATE`),
    beneficiary:required(`${prefix}_BENEFICIARY`),
    reference:required(`${prefix}_REFERENCE`),
    description:required(`${prefix}_DESCRIPTION`),
    clientRequestId:key,
  };
}

async function postDisbursement(base:URL,session:Session,remunerationId:string,payload:Json){
  const response=await request(base,`/api/hr/provider-remunerations/${remunerationId}/disburse`,{method:'POST',headers:auth(session),body:JSON.stringify(payload)});
  const body=await json(response);
  return{status:response.status,body};
}

async function postJson(base:URL,session:Session,path:string,body:Json={}){
  const response=await request(base,path,{method:'POST',headers:auth(session),body:JSON.stringify(body)});
  const payload=await json(response);
  return{status:response.status,body:payload};
}

async function expectPost(base:URL,session:Session,path:string,body:Json,status:number){
  const result=await postJson(base,session,path,body);
  assert.equal(result.status,status,`${path}: HTTP ${result.status}, attendu ${status}`);
  return result.body;
}

async function prepareFinancialFixture(base:URL,sessions:{provider:Session;approver:Session;finance:Session},budgetId:string,sequence:string,amountValue:number,requirements:Json[]=[]){
  const reference=`REC02-4-${sequence}-${Date.now()}-${randomUUID().slice(0,8)}`.toUpperCase();
  const contract=await expectPost(base,sessions.provider,'/api/hr/providers/1/contracts',{
    assignmentId:'1',reference,serviceSubject:`Recette technique ${sequence} ${reference.slice(-8)}`,
    description:'Donnée fictive isolée REC-02.4',startDate:new Date().toISOString().slice(0,10),
    compensationMode:'FIXED',contractualAmount:amountValue,paymentTerms:'Recette HTTP locale',
    specialConditions:'Aucune incidence métier réelle',requirements,
  },201);
  const contractId=String(contract.id);
  await expectPost(base,sessions.provider,`/api/hr/provider-contracts/${contractId}/activate`,{},200);
  const remuneration=await expectPost(base,sessions.provider,'/api/hr/provider-remunerations',{contractId,grossAmount:amountValue,withholdingAmount:0},201);
  const remunerationId=String(remuneration.id);
  await expectPost(base,sessions.provider,`/api/hr/provider-remunerations/${remunerationId}/submit`,{},200);
  await expectPost(base,sessions.approver,`/api/hr/provider-remunerations/${remunerationId}/validate`,{},200);
  const finance=await expectPost(base,sessions.finance,`/api/hr/provider-remunerations/${remunerationId}/finance-request`,{budgetId},201);
  const expenseId=String(finance.budgetExpenseId);
  await expectPost(base,sessions.finance,`/api/hr/expenses/${expenseId}/submit`,{},200);
  await expectPost(base,sessions.approver,`/api/hr/expenses/${expenseId}/approve`,{},200);
  return{contractId,remunerationId,expenseId,amount:amountValue,reference};
}

function paymentPayload(sequence:string,key:string,amountValue:number){
  return{instrumentId:'1',accountId:'1',categoryId:'1',paymentMethodId:'1',amount:amountValue,
    valueDate:new Date().toISOString().slice(0,10),beneficiary:`Prestataire REC-02.4 ${sequence}`,
    reference:`REC02-4-PAY-${sequence}-${randomUUID().slice(0,8)}`,description:`Décaissement fictif ${sequence}`,clientRequestId:key};
}

if(enabled){
  if(process.env.REC02_HTTP_RECOVERY==='1')test('REC02.4 HTTP : quatre comptes rétablis et permissions minimales attendues',{timeout:60_000},async()=>{
    const base=await localBaseUrl(),expectations:[string,string[]][]=[
      ['REC02_TREASURER',['hr.provider.remuneration.disburse','hr.expense.disburse','treasury.disbursement.create']],
      ['REC02_FINANCE',['hr.provider.remuneration.finance.request','hr.expense.create','hr.expense.submit']],
      ['REC02_APPROVER',['hr.provider.remuneration.validate','hr.expense.approve','hr.provider.document_exception.approve']],
      ['REC02_PROVIDER',['hr.providers.manage','hr.provider.contract.manage','hr.provider.remuneration.prepare','ged.upload','ged.view']],
    ];
    for(const[prefix,codes]of expectations){
      const session=await login(base,prefix),me=await request(base,'/api/auth/me',{headers:auth(session)});
      assert.equal(me.status,200,`${prefix}: /auth/me refusé`);
      const profile=(await json(me)).user as Json,permissions=new Set(((profile.permissions??[])as Json[]).map(x=>String(x.code)));
      assert.equal(profile.email,process.env[`${prefix}_EMAIL`],`${prefix}: identité inattendue`);
      for(const code of codes)assert.ok(permissions.has(code),`${prefix}: permission ${code} absente`);
    }
  });
  if(process.env.REC02_HTTP_AUTH==='1')test('REC02.3 HTTP : authentification officielle, identité, route autorisée et refus fonctionnel',{timeout:30_000},async()=>{
    const base=await localBaseUrl(),treasurer=await login(base,'REC02_TREASURER');
    const me=await request(base,'/api/auth/me',{headers:auth(treasurer)});
    assert.equal(me.status,200,'Le compte trésorier doit accéder à /api/auth/me');
    const profile=(await json(me)).user as Json;
    assert.equal(profile.email,process.env.REC02_TREASURER_EMAIL);
    const allowed=await request(base,'/api/hr/provider-remunerations?page=1&pageSize=1',{headers:auth(treasurer)});
    assert.equal(allowed.status,200,'La lecture des rémunérations doit être autorisée au trésorier');
    const forbidden=await request(base,'/api/users?page=1&pageSize=1',{headers:auth(treasurer)});
    assert.equal(forbidden.status,403,'La gestion des utilisateurs doit rester interdite au trésorier');
  });

  if(process.env.REC02_HTTP_IDOR==='1')test('REC02.3 HTTP : IDOR territorial direct AGENCY, CONCESSION et GLOBAL',{timeout:60_000},async()=>{
    const base=await localBaseUrl(),agency=await login(base,'REC02_AGENCY'),concession=await login(base,'REC02_CONCESSION'),global=await login(base,'REC02_GLOBAL'),localId=numeric('REC02_IDOR_LOCAL_PROVIDER_ID'),sameConcessionId=numeric('REC02_IDOR_SAME_CONCESSION_PROVIDER_ID'),otherConcessionId=numeric('REC02_IDOR_OTHER_CONCESSION_PROVIDER_ID');
    const get=(session:Session,id:string)=>request(base,`/api/hr/providers/${id}`,{headers:auth(session)});
    assert.equal((await get(agency,localId)).status,200,'AGENCY doit lire son prestataire local');
    assert.equal((await get(agency,sameConcessionId)).status,404,'AGENCY ne doit pas lire une autre agence');
    assert.equal((await get(agency,otherConcessionId)).status,404,'AGENCY ne doit pas lire une autre concession');
    assert.equal((await get(concession,localId)).status,200,'CONCESSION doit lire son agence principale');
    assert.equal((await get(concession,sameConcessionId)).status,200,'CONCESSION doit lire une autre agence de sa concession');
    assert.equal((await get(concession,otherConcessionId)).status,404,'CONCESSION ne doit pas lire une autre concession');
    for(const id of[localId,sameConcessionId,otherConcessionId])assert.equal((await get(global,id)).status,200,'GLOBAL doit lire les prestataires autorisés');
    const before=await mysqlScalar(`SELECT CONCAT_WS('|',service_nature,provider_status,updated_at) FROM provider_profiles WHERE id=${otherConcessionId}`);
    const deniedPatch=await request(base,`/api/hr/providers/${otherConcessionId}`,{method:'PATCH',headers:auth(agency),body:JSON.stringify({serviceNature:'REC02-IDOR-INTERDIT'})});
    assert.equal(deniedPatch.status,403,'Le compte AGENCY en lecture seule ne doit pas pouvoir modifier');
    assert.equal(await mysqlScalar(`SELECT CONCAT_WS('|',service_nature,provider_status,updated_at) FROM provider_profiles WHERE id=${otherConcessionId}`),before,'La tentative interdite ne doit produire aucune modification MySQL');
  });

  if(process.env.REC02_HTTP_IDEMPOTENCE==='1')test('REC02.3 HTTP : rejeu idempotent réel et preuve MySQL',{timeout:60_000},async()=>{
    const base=await localBaseUrl(),treasurer=await login(base,'REC02_TREASURER'),remunerationId=numeric('REC02_IDEMP_REMUNERATION_ID'),expenseId=numeric('REC02_IDEMP_EXPENSE_ID'),key=process.env.REC02_IDEMP_KEY??randomUUID(),payload=disbursementPayload('REC02_IDEMP',key,Number(required('REC02_IDEMP_AMOUNT')));
    const before=await mysqlScalar(`SELECT CONCAT(COUNT(*),'|',COALESCE(SUM(amount),0)) FROM budget_expense_disbursements WHERE budget_expense_id=${expenseId}`);
    const first=await postDisbursement(base,treasurer,remunerationId,payload);
    assert.equal(first.status,201,'Le premier décaissement doit être créé');
    assert.equal(first.body.duplicate,false);
    const afterFirst=await mysqlScalar(`SELECT CONCAT(COUNT(*),'|',COALESCE(SUM(amount),0)) FROM budget_expense_disbursements WHERE budget_expense_id=${expenseId}`);
    const replay=await postDisbursement(base,treasurer,remunerationId,payload);
    assert.equal(replay.status,200,'Le rejeu identique doit suivre le contrat HTTP');
    assert.equal(replay.body.duplicate,true);
    assert.equal(replay.body.id,first.body.id);
    assert.equal(await mysqlScalar(`SELECT CONCAT(COUNT(*),'|',COALESCE(SUM(amount),0)) FROM budget_expense_disbursements WHERE budget_expense_id=${expenseId}`),afterFirst,'Le rejeu ne doit créer aucune écriture');
    assert.notEqual(afterFirst,before,'La première requête doit créer exactement l’effet attendu');
    const conflict=await postDisbursement(base,treasurer,remunerationId,{...payload,amount:Number(payload.amount)+1});
    assert.equal(conflict.status,409,'Une même clé avec un payload différent doit être refusée');
  });

  if(process.env.REC02_HTTP_CONCURRENCY==='1')test('REC02.3 HTTP : trois courses réelles 400k + 400k sur 600k',{timeout:120_000},async()=>{
    const base=await localBaseUrl(),treasurer=await login(base,'REC02_TREASURER');
    for(let round=1;round<=3;round++){
      const prefix=`REC02_RACE_${round}`,remunerationId=numeric(`${prefix}_REMUNERATION_ID`),expenseId=numeric(`${prefix}_EXPENSE_ID`),a=disbursementPayload(prefix,randomUUID(),400_000),b=disbursementPayload(prefix,randomUUID(),400_000);
      const start=Promise.withResolvers<void>();
      const launch=async(payload:Json)=>{await start.promise;return postDisbursement(base,treasurer,remunerationId,payload)};
      const pending=[launch(a),launch(b)];start.resolve();
      const results=await Promise.all(pending);
      assert.equal(results.filter(x=>x.status===201).length,1,`Course ${round}: un seul succès attendu`);
      assert.equal(results.filter(x=>x.status===409).length,1,`Course ${round}: un seul refus attendu`);
      const proof=await mysqlScalar(`SELECT CONCAT(COUNT(*),'|',COALESCE(SUM(d.amount),0),'|',SUM(tm.id IS NOT NULL)) FROM budget_expense_disbursements d LEFT JOIN treasury_movements tm ON tm.source_type='BUDGET_EXPENSE_DISBURSEMENT' AND CAST(tm.source_id AS UNSIGNED)=d.id AND tm.event_type='POSTED' WHERE d.budget_expense_id=${expenseId}`);
      assert.equal(proof,'1|400000.00|1',`Course ${round}: preuve MySQL incohérente`);
    }
  });

  if(process.env.REC02_HTTP_CLOSURE==='1')test('REC02.4 HTTP : clôture finance, idempotence, concurrence et GED',{timeout:180_000},async()=>{
    const base=await localBaseUrl(),sessions={
      provider:await login(base,'REC02_PROVIDER'),approver:await login(base,'REC02_APPROVER'),
      finance:await login(base,'REC02_FINANCE'),treasurer:await login(base,'REC02_TREASURER'),
    };
    const today=new Date().toISOString().slice(0,10),year=Number(today.slice(0,4));
    const budget=await expectPost(base,sessions.finance,'/api/hr/budgets',{
      scopeType:'agency',agencyId:'1',label:`REC-02.4 ${Date.now()}`,initialAmount:3_000_000,
      startDate:`${year}-01-01`,endDate:`${year}-12-31`,
    },201),budgetId=String(budget.id);
    await expectPost(base,sessions.finance,`/api/hr/budgets/${budgetId}/submit`,{},200);
    await expectPost(base,sessions.approver,`/api/hr/budgets/${budgetId}/approve`,{},200);

    const idempotence=await prepareFinancialFixture(base,sessions,budgetId,'IDEMP',100_000);
    const idemKey=randomUUID(),idemPayload=paymentPayload('IDEMP',idemKey,100_000);
    const first=await postDisbursement(base,sessions.treasurer,idempotence.remunerationId,idemPayload);
    assert.equal(first.status,201); assert.equal(first.body.duplicate,false);
    const afterFirst=await mysqlScalar(`SELECT CONCAT(COUNT(*),'|',COALESCE(SUM(amount),0)) FROM budget_expense_disbursements WHERE budget_expense_id=${idempotence.expenseId}`);
    const replay=await postDisbursement(base,sessions.treasurer,idempotence.remunerationId,idemPayload);
    assert.equal(replay.status,200); assert.equal(replay.body.duplicate,true); assert.equal(replay.body.id,first.body.id);
    assert.equal(await mysqlScalar(`SELECT CONCAT(COUNT(*),'|',COALESCE(SUM(amount),0)) FROM budget_expense_disbursements WHERE budget_expense_id=${idempotence.expenseId}`),afterFirst);
    assert.equal((await postDisbursement(base,sessions.treasurer,idempotence.remunerationId,{...idemPayload,amount:99_999})).status,409);

    for(let round=1;round<=3;round++){
      const fixture=await prepareFinancialFixture(base,sessions,budgetId,`RACE${round}`,600_000),start=Promise.withResolvers<void>();
      const launch=async()=>{await start.promise;return postDisbursement(base,sessions.treasurer,fixture.remunerationId,paymentPayload(`RACE${round}`,randomUUID(),400_000))};
      const pending=[launch(),launch()]; start.resolve(); const results=await Promise.all(pending);
      assert.equal(results.filter(x=>x.status===201).length,1,`Course ${round}: un succès attendu`);
      assert.equal(results.filter(x=>x.status===409).length,1,`Course ${round}: un refus attendu`);
      assert.equal(await mysqlScalar(`SELECT CONCAT(COUNT(*),'|',COALESCE(SUM(d.amount),0),'|',SUM(tm.id IS NOT NULL)) FROM budget_expense_disbursements d LEFT JOIN treasury_movements tm ON tm.source_type='BUDGET_EXPENSE_DISBURSEMENT' AND CAST(tm.source_id AS UNSIGNED)=d.id AND tm.event_type='POSTED' WHERE d.budget_expense_id=${fixture.expenseId}`),'1|400000.00|1');
    }

    const documentTypeId=await mysqlScalar("SELECT id FROM document_types WHERE is_active=TRUE ORDER BY CASE WHEN UPPER(code) IN('INVOICE','FACTURE') THEN 0 ELSE 1 END,id LIMIT 1");
    const categoryId=await mysqlScalar(`SELECT category_id FROM document_types WHERE id=${documentTypeId}`);
    assert.match(documentTypeId,/^[1-9]\d*$/); assert.match(categoryId,/^[1-9]\d*$/);
    const ged=await prepareFinancialFixture(base,sessions,budgetId,'GED-UPLOAD',50_000,[{documentTypeId,required:true,stage:'PAYMENT'}]);
    assert.equal((await postDisbursement(base,sessions.treasurer,ged.remunerationId,paymentPayload('GED-MISSING',randomUUID(),50_000))).status,409);
    await expectPost(base,sessions.finance,`/api/hr/provider-remunerations/${ged.remunerationId}/document-exceptions`,{documentTypeId,reason:'Test REC-02.4 du refus documentaire'},201);
    await expectPost(base,sessions.approver,`/api/hr/provider-remunerations/${ged.remunerationId}/document-exceptions/${documentTypeId}/reject`,{reason:'Document requis pour ce scénario'},200);
    assert.equal((await postDisbursement(base,sessions.treasurer,ged.remunerationId,paymentPayload('GED-REJECTED',randomUUID(),50_000))).status,409);
    const bytes=Buffer.from('%PDF-1.4\n% REC-02.4 document fictif\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n');
    const form=new FormData(); form.set('title','Justificatif fictif REC-02.4'); form.set('categoryId',categoryId); form.set('documentTypeId',documentTypeId); form.set('entityType','provider_contract'); form.set('entityId',ged.contractId); form.set('file',new Blob([bytes],{type:'application/pdf'}),'rec02-4.pdf');
    const upload=await request(base,'/api/documents',{method:'POST',headers:{authorization:`Bearer ${sessions.provider.accessToken}`},body:form}),uploadBody=await json(upload);
    assert.equal(upload.status,201); const documentId=String(uploadBody.id);
    assert.equal((await postDisbursement(base,sessions.treasurer,ged.remunerationId,paymentPayload('GED-UPLOAD',randomUUID(),50_000))).status,201);
    const download=await request(base,`/api/documents/${documentId}/download`,{headers:{authorization:`Bearer ${sessions.provider.accessToken}`}});
    assert.equal(download.status,200); const downloaded=Buffer.from(await download.arrayBuffer());
    assert.equal(createHash('sha256').update(downloaded).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
    assert.equal((await request(base,`/api/documents/${documentId}/download`,{headers:{authorization:`Bearer ${sessions.treasurer.accessToken}`}})).status,403);

    const exception=await prepareFinancialFixture(base,sessions,budgetId,'GED-EXCEPTION',50_000,[{documentTypeId,required:true,stage:'PAYMENT'}]);
    await expectPost(base,sessions.finance,`/api/hr/provider-remunerations/${exception.remunerationId}/document-exceptions`,{documentTypeId,reason:'Exception fictive REC-02.4'},201);
    await expectPost(base,sessions.approver,`/api/hr/provider-remunerations/${exception.remunerationId}/document-exceptions/${documentTypeId}/approve`,{},200);
    assert.equal((await postDisbursement(base,sessions.treasurer,exception.remunerationId,paymentPayload('GED-EXCEPTION',randomUUID(),50_000))).status,201);

    const proof=await mysqlScalar(`SELECT CONCAT(b.status,'|',COUNT(DISTINCT pr.id),'|',COUNT(DISTINCT e.id),'|',COUNT(DISTINCT d.id)) FROM budgets b LEFT JOIN budget_expenses e ON e.budget_id=b.id LEFT JOIN provider_remunerations pr ON pr.budget_expense_id=e.id LEFT JOIN budget_expense_disbursements d ON d.budget_expense_id=e.id WHERE b.id=${budgetId} GROUP BY b.id,b.status`);
    assert.equal(proof,'active|6|6|6','La synthèse MySQL des fixtures REC-02.4 est incohérente');
  });
}
