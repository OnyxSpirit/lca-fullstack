import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {after,before,beforeEach,test} from 'node:test';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {pool} from '../src/config/database.js';
import {RbacTestSessionFixture,type TestPermission} from './support/rbac-test-session.js';

type Visit={id:string;agency_id:string;visitor_name:string;phone:string|null;status:string;arrival_at:string;assigned_user_id:string|null;greeted_by:string;queue_number:number};
const originalExecute=pool.execute.bind(pool),originalGetConnection=pool.getConnection.bind(pool),auth=new RbacTestSessionFixture(),app=createApp(),A1='11',A2='12',U1='101',today=new Date().toISOString().slice(0,10),yesterday=new Date(Date.now()-86_400_000).toISOString().slice(0,10);
let visits:Visit[]=[],nextId=10;
const phone=(value:unknown)=>{const digits=String(value??'').replace(/\D/g,'');return digits.startsWith('242')?digits.slice(3):digits};
const name=(value:unknown)=>String(value??'').trim().replace(/\s+/g,' ').toLocaleLowerCase('fr');
const decorated=(visit:Visit)=>({...visit,origin:'showroom',reason:'Accueil',preferred_model:null,vehicle_id:null,lead_id:null,customer_id:null,outcome:'pending',assigned_user_name:visit.assigned_user_id?'Conseiller Test':null,greeted_by_name:'Accueil',vehicle_label:null,wait_minutes:0,active_test_drive_id:null,active_test_drive_mileage:null});
function reset(){visits=[
  {id:'1',agency_id:A1,visitor_name:'Jean  Dupont',phone:'+242 06 123 45 67',status:'waiting',arrival_at:`${today} 09:00:00`,assigned_user_id:null,greeted_by:U1,queue_number:1},
  {id:'2',agency_id:A1,visitor_name:'Ancien Visiteur',phone:'06 999 99 99',status:'completed',arrival_at:`${yesterday} 09:00:00`,assigned_user_id:U1,greeted_by:U1,queue_number:2},
  {id:'3',agency_id:A2,visitor_name:'Jean Dupont',phone:'061234567',status:'assigned',arrival_at:`${today} 10:00:00`,assigned_user_id:'202',greeted_by:'202',queue_number:1},
];nextId=10}
function roleRows(userId:string){const role=auth.roles.get(auth.userRoles.get(userId)??'');return role?[{id:role.id,code:role.code,is_system:0}]:[]}
async function domainQuery(sql:string,params:unknown[]=[]):Promise<any>{
  if(sql.includes('JOIN refresh_tokens rt'))return auth.authRows(params);
  if(sql.includes('SELECT r.id,r.code,r.is_system FROM users u JOIN user_roles'))return roleRows(String(params[0]));
  if(sql.includes('SELECT p.code,rp.scope FROM role_permissions'))return auth.roles.get(String(params[0]))?.permissions??[];
  if(sql.includes('FROM agencies target')){const target=String(params[1]);return target===A1||target===A2?[{id:target,is_active:1,concession_id:'C1',actor_concession_id:'C1'}]:[]}
  if(sql.includes('phone_match')&&sql.includes('FROM showroom_visits sv')){
    const searchedPhone=String(params[0]),searchedName=String(params[1]),agency=String(params[2]);
    return visits.filter(visit=>visit.agency_id===agency&&visit.arrival_at.startsWith(today)&&(searchedPhone&&phone(visit.phone)===searchedPhone||searchedName&&name(visit.visitor_name)===searchedName)).slice(0,10).map(visit=>({...visit,assigned_user_name:visit.assigned_user_id?'Conseiller Test':null,phone_match:Number(Boolean(searchedPhone)&&phone(visit.phone)===searchedPhone),name_match:Number(Boolean(searchedName)&&name(visit.visitor_name)===searchedName)}));
  }
  if(sql.includes('FROM customers WHERE agency_id=')||sql.includes('FROM leads l LEFT JOIN users'))return[];
  if(sql.includes('FROM showroom_visits sv')){const row=visits.find(visit=>visit.id===String(params[0]));return row?[decorated(row)]:[]}
  return[];
}
async function connectionQuery(sql:string,params:unknown[]=[]):Promise<any>{
  if(sql.includes('SELECT COALESCE(MAX(queue_number)'))return[{next_number:visits.filter(v=>v.agency_id===String(params[0])&&v.arrival_at.startsWith(today)).length+1}];
  if(sql.startsWith('INSERT INTO showroom_visits')){const id=String(nextId++);visits.push({id,agency_id:String(params[8]),visitor_name:String(params[2]),phone:params[3]==null?null:String(params[3]),status:'waiting',arrival_at:`${today} 12:00:00`,assigned_user_id:null,greeted_by:String(params[7]),queue_number:Number(params[9])});return{insertId:Number(id),affectedRows:1}}
  return domainQuery(sql,params);
}

before(()=>{auth.addAgency({id:A1,concessionId:'C1'});auth.addAgency({id:A2,concessionId:'C1'});(pool as any).execute=async(sql:string,params:unknown[]=[])=>[await domainQuery(sql,params),[]];(pool as any).getConnection=async()=>({beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(sql:string,params:unknown[]=[])=>[await connectionQuery(sql,params),[]]})});
after(()=>{(pool as any).execute=originalExecute;(pool as any).getConnection=originalGetConnection});beforeEach(reset);
function bearer(scope:TestPermission['scope']='AGENCY'){return`Bearer ${auth.createRbacTestSession({user:{id:U1,agencyId:A1},roleCode:`SHOWROOM_DUP_${scope}_${Date.now()}_${Math.random()}`,permissions:[{code:'showroom.view',scope},{code:'showroom.visitor.create',scope}]}).accessToken}`}
const detect=(query:string,scope:TestPermission['scope']='AGENCY')=>request(app).get(`/api/showroom/detect?agencyId=${A1}&${query}`).set('Authorization',bearer(scope));

test('DUP-PHONE-01/02 téléphone normalisé du jour produit une correspondance forte',async()=>{for(const value of ['061234567','06 123-45-67','+242 06 123 45 67']){const response=await detect(`phone=${encodeURIComponent(value)}&name=Autre`);assert.equal(response.status,200);assert.deepEqual(response.body.matches.map((match:{id:string;strength:string})=>[match.id,match.strength]),[['1','strong']])}});
test('DUP-PHONE-03 et DUP-NAME-06 ignorent les visites des jours précédents',async()=>{const byPhone=await detect('phone=069999999&name=Nouveau'),byName=await detect('phone=&name=Ancien%20Visiteur');assert.deepEqual(byPhone.body.matches,[]);assert.deepEqual(byName.body.matches,[])});
test('DUP-PHONE-04/05 ne révèle ni ressource OWN étrangère ni autre agence hors scope',async()=>{const own=await detect('phone=061234567&name=Jean%20Dupont','OWN');assert.deepEqual(own.body.matches.map((match:{id:string})=>match.id),['1']);const other=await request(app).get(`/api/showroom/detect?agencyId=${A2}&phone=061234567&name=Jean`).set('Authorization',bearer('AGENCY'));assert.equal(other.status,403);assert.equal(other.body.matches,undefined)});
test('DUP-NAME-01/02/03 nom normalisé du jour produit une correspondance potentielle',async()=>{for(const value of ['Jean Dupont','JEAN DUPONT','  jean   dupont  ']){const response=await detect(`phone=&name=${encodeURIComponent(value)}`);assert.deepEqual(response.body.matches.map((match:{id:string;strength:string})=>[match.id,match.strength]),[['1','potential']])}});
test('DUP-NAME-04/05 même nom avec téléphone différent reste enregistrable',async()=>{const response=await request(app).post('/api/showroom').set('Authorization',bearer()).send({visitorName:' JEAN   DUPONT ',phone:'06 777 77 77',reason:'Accueil',agencyId:A1});assert.equal(response.status,201);assert.equal(visits.length,4)});
test('DUP-CONFIRM-01/02 une correspondance forte bloque la première création sans modifier les visites',async()=>{const before=visits.length,response=await request(app).post('/api/showroom').set('Authorization',bearer()).send({visitorName:'Autre',phone:'061234567',reason:'Accueil',agencyId:A1});assert.equal(response.status,409);assert.equal(response.body.details.code,'SHOWROOM_DUPLICATE_CONFIRMATION_REQUIRED');assert.equal(response.body.details.matches[0].id,'1');assert.equal(visits.length,before)});
test('DUP-CONFIRM-03 confirmation explicite crée une seconde visite légitime',async()=>{const response=await request(app).post('/api/showroom').set('Authorization',bearer()).send({visitorName:'Autre',phone:'061234567',reason:'Accueil',agencyId:A1,duplicateConfirmation:'CREATE_ANYWAY'});assert.equal(response.status,201);assert.equal(visits.length,4)});
test('DUP-CONFIRM-04 confirmation ne contourne pas le scope agence',async()=>{const response=await request(app).post('/api/showroom').set('Authorization',bearer('AGENCY')).send({visitorName:'Autre',phone:'061234567',reason:'Accueil',agencyId:A2,duplicateConfirmation:'CREATE_ANYWAY'});assert.equal(response.status,403);assert.equal(visits.length,3)});
test('DUP-CONFIRM-05 création confirmée invalide le Board paginé et ses agrégats',()=>{const routes=readFileSync(new URL('../src/modules/showroom/showroom.routes.ts',import.meta.url),'utf8'),hooks=readFileSync(new URL('../../frontend/src/api/erpHooks.ts',import.meta.url),'utf8');assert.match(routes,/showroomDuplicateMatches\(request,agency,name,phone,duplicatePermission,connection\)/);assert.match(hooks,/useCreateShowroomVisit[\s\S]*invalidateQueries\(\{ queryKey: \["showroom"\] \}\)/)});
