import assert from 'node:assert/strict';
import { after, before, beforeEach, describe, test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/database.js';
import { RbacTestSessionFixture, type TestPermission, type TestScope } from './support/rbac-test-session.js';

type VehicleRow={id:string;agency_id:string;vin:string;stock_number:string;registration_number:string;status:string;notes:string;created_by:string;brand_id:string;brand:string;model_id:string;model:string;version_id:string;version:string;agency_name:string;purchase_price:number;sale_price:number;catalog_price:number;minimum_price:number;refurbishment_cost:number;transport_cost:number;administrative_cost:number;additional_costs:number;archived_at:null|string;location_id:null;supplier_id:null;mileage:number;vehicle_type:string;entry_date:string;created_at:string;updated_at:string};
const A1='11',A2='12',B1='21',U1='101';
const concession=(agency:string)=>agency===B1?'C2':'C1';
const seed:VehicleRow[]=[
  row('201',A1,'WVWZZZ1JZXW000001','VIN-A1'),
  row('202',A2,'WVWZZZ1JZXW000002','VIN-A2'),
  row('203',B1,'WVWZZZ1JZXW000003','VIN-B1'),
];
function row(id:string,agency:string,vin:string,notes:string):VehicleRow{return{id,agency_id:agency,vin,stock_number:`STK-${id}`,registration_number:`REG-${id}`,status:'received',notes,created_by:U1,brand_id:'1',brand:'MarqueScope',model_id:'1',model:'ModeleScope',version_id:'1',version:'Runtime',agency_name:`Agence ${agency}`,purchase_price:10,sale_price:20,catalog_price:22,minimum_price:18,refurbishment_cost:1,transport_cost:1,administrative_cost:1,additional_costs:1,archived_at:null,location_id:null,supplier_id:null,mileage:100,vehicle_type:'used',entry_date:'2026-01-01',created_at:'2026-01-01',updated_at:'2026-01-01'}}
let vehicles:VehicleRow[]=[];let nextId=900;
const auth=new RbacTestSessionFixture(),app=createApp();
const originalExecute=pool.execute.bind(pool),originalGetConnection=pool.getConnection.bind(pool);
function reset(){vehicles=seed.map(item=>({...item}));nextId=900}
function roleRows(userId:string){const role=auth.roles.get(auth.userRoles.get(userId)??'');return role?[{id:role.id,code:role.code,is_system:0}]:[]}
function scoped(sql:string,params:unknown[],vehicle:VehicleRow,idFirst=false){
  const offset=idFirst?1:0;
  if(sql.includes('v.agency_id=?'))return vehicle.agency_id===String(params[offset]);
  if(sql.includes('v.agency_id IN (SELECT id FROM agencies WHERE concession_id='))return concession(vehicle.agency_id)===concession(String(params[offset]));
  return true;
}
function matching(sql:string,params:unknown[]){
  const idFirst=sql.includes('v.id=?');
  const searchIndex=params.findIndex(value=>String(value).startsWith('%')&&String(value).endsWith('%'));
  const search=searchIndex<0?'':String(params[searchIndex]).slice(1,-1).toLowerCase();
  return vehicles.filter(v=>!v.archived_at&&(!idFirst||v.id===String(params[0]))&&scoped(sql,params,v,idFirst)&&(!search||[v.brand,v.model,v.version,v.vin,v.stock_number,v.registration_number].some(value=>String(value).toLowerCase().includes(search))));
}
async function domainQuery(sql:string,params:unknown[]=[]):Promise<any>{
  if(sql.includes('JOIN refresh_tokens rt'))return auth.authRows(params);
  if(sql.includes('SELECT r.id,r.code,r.is_system FROM users u JOIN user_roles'))return roleRows(String(params[0]));
  if(sql.includes('SELECT p.code,rp.scope FROM role_permissions'))return auth.roles.get(String(params[0]))?.permissions??[];
  if(sql.startsWith('SELECT a.id,a.name,a.code,a.concession_id')){
    const actor=String(params[0]),ids=sql.includes('1=1')?[A1,A2,B1]:sql.includes('a.concession_id=')?[A1,A2]:[actor];
    return ids.map(id=>({id,name:`Agence ${id}`,code:`A${id}`,concession_id:concession(id),actor_concession_id:concession(actor)}));
  }
  if(sql.startsWith('SELECT id FROM agencies WHERE id=? AND concession_id=')){const target=String(params[0]),actor=String(params[1]);return concession(target)===concession(actor)?[{id:target}]:[]}
  if(sql.includes('FROM vehicles v JOIN versions')&&sql.includes('COUNT(*) total'))return[{total:matching(sql,params).length}];
  if(sql.includes('FROM vehicles v JOIN versions'))return matching(sql,params);
  if(sql.startsWith('SELECT COUNT(*) total')&&sql.includes('FROM vehicles v WHERE')){
    const visible=matching(sql,params),count=(status:string)=>visible.filter(v=>v.status===status).length;
    return[{total:visible.length,ordered:count('ordered'),in_transit:count('in_transit'),received:count('received'),preparation:count('preparation'),available:count('available'),reserved:count('reserved'),sold:count('sold'),delivered:count('delivered'),dormant:0,stock_value:visible.reduce((n,v)=>n+v.sale_price,0)}];
  }
  if(sql.startsWith('SELECT DISTINCT b.id,b.name'))return[{id:1,name:'MarqueScope'}];
  if(sql.startsWith('SELECT DISTINCT m.id'))return[{id:1,brand_id:1,name:'ModeleScope'}];
  if(sql.startsWith('SELECT id FROM agencies WHERE id=? AND is_active=TRUE'))return [A1,A2,B1].includes(String(params[0]))?[{id:params[0]}]:[];
  if(sql.startsWith('UPDATE vehicles SET archived_at=')){const v=vehicles.find(x=>x.id===String(params[0]));if(v)v.archived_at='2026-09-26';return{affectedRows:v?1:0}}
  return [];
}
async function connectionQuery(sql:string,params:unknown[]=[]):Promise<any>{
  if(sql.startsWith('SELECT id FROM brands'))return[{id:1}];
  if(sql.startsWith('SELECT id FROM models'))return[{id:1}];
  if(sql.startsWith('SELECT id FROM versions'))return[{id:1}];
  if(sql.startsWith('INSERT INTO vehicles(')){const id=String(nextId++),agency=String(params[1]),created=row(id,agency,String(params[5]),'creation');created.purchase_price=Number(params[19]??0);vehicles.push(created);return{insertId:Number(id),affectedRows:1}}
  if(sql.startsWith('UPDATE vehicles SET stock_number=')){const v=vehicles.find(x=>x.id===String(params[1]));if(v)v.stock_number=String(params[0]);return{affectedRows:v?1:0}}
  if(sql.startsWith('UPDATE vehicles SET status=')){const v=vehicles.find(x=>x.id===String(params.at(-1)));if(v)v.status=String(params[0]);return{affectedRows:v?1:0}}
  if(sql.startsWith('UPDATE vehicles SET agency_id=')){const v=vehicles.find(x=>x.id===String(params[2]));if(v)v.agency_id=String(params[0]);return{affectedRows:v?1:0}}
  if(sql.startsWith('UPDATE vehicles SET ')&&sql.includes(' WHERE id=?')){const v=vehicles.find(x=>x.id===String(params.at(-1)));if(v){if(sql.includes('notes=?'))v.notes=String(params[0]);if(sql.includes('purchase_price=?'))v.purchase_price=Number(params[0])}return{affectedRows:v?1:0}}
  if(sql.startsWith('SELECT id FROM vehicles WHERE id=? FOR UPDATE'))return vehicles.some(v=>v.id===String(params[0]))?[{id:params[0]}]:[];
  if(sql.startsWith('SELECT COUNT(*) total')&&sql.includes('vehicle_images'))return[{total:0,max_sort:-1}];
  if(sql.startsWith('SELECT id FROM vehicle_images WHERE'))return[{id:params[0]}];
  if(sql.startsWith('SELECT * FROM vehicle_images WHERE'))return[{id:params[0],vehicle_id:params[1],file_path:null,thumbnail_path:null,is_primary:0}];
  if(sql.startsWith('DELETE FROM vehicle_images')||sql.startsWith('UPDATE vehicle_images'))return{affectedRows:1};
  if(sql.startsWith('INSERT INTO')||sql.startsWith('UPDATE '))return{affectedRows:1};
  return domainQuery(sql,params);
}
before(()=>{
  for(const agency of [{id:A1,concessionId:'C1'},{id:A2,concessionId:'C1'},{id:B1,concessionId:'C2'}])auth.addAgency(agency);
  (pool as any).execute=async(sql:string,params:unknown[]=[])=>[await domainQuery(sql,params),[]];
  (pool as any).getConnection=async()=>({beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(sql:string,params:unknown[]=[])=>[await connectionQuery(sql,params),[]]});
});
after(()=>{(pool as any).execute=originalExecute;(pool as any).getConnection=originalGetConnection});beforeEach(reset);
function bearer(permissions:TestPermission[]){return`Bearer ${auth.createRbacTestSession({user:{id:U1,agencyId:A1},roleCode:`ROLE_VEHICLE_RUNTIME_${Date.now()}_${Math.random()}`,permissions}).accessToken}`}
const allowed=(scope:TestScope,agency:string)=>scope==='GLOBAL'||scope==='CONCESSION'&&agency!==B1||scope==='AGENCY'&&agency===A1;
const expectStatus=(actual:number,expected:number,label:string)=>assert.equal(actual,expected,`${label}: HTTP ${actual} au lieu de ${expected}`);
const ids={[A1]:'201',[A2]:'202',[B1]:'203'};

describe('RBAC-PERMISSION-RECETTE-03 — matrice runtime Stock véhicules',()=>{
  for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const)test(`agences de création ${scope}`,async()=>{
    const response=await request(app).get('/api/vehicles/agencies/create').set('Authorization',bearer([{code:'vehicles.create',scope},{code:'vehicles.financials.view',scope:scope==='OWN'?'AGENCY':scope}]));
    if(scope==='OWN')return expectStatus(response.status,403,'agences create OWN');
    expectStatus(response.status,200,`agences create ${scope}`);assert.deepEqual(response.body.map((agency:{id:string})=>agency.id),scope==='GLOBAL'?[A1,A2,B1]:scope==='CONCESSION'?[A1,A2]:[A1]);assert.equal(response.body.every((agency:{financialAllowed:boolean})=>agency.financialAllowed),true);
  });
  for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const)test(`vehicles.view ${scope}: liste, total, KPI, filtres et recherche`,async()=>{
    const token=bearer([{code:'vehicles.view',scope}]);
    if(scope==='OWN'){
      expectStatus((await request(app).get('/api/vehicles').set('Authorization',token)).status,403,'OWN liste non applicable');
      return;
    }
    const expected=scope==='GLOBAL'?3:scope==='CONCESSION'?2:1;
    for(const path of ['/api/vehicles?page=1&pageSize=1','/api/vehicles?brandId=1&modelId=1','/api/vehicles?search=MarqueScope']){
      const response=await request(app).get(path).set('Authorization',token);expectStatus(response.status,200,`${scope} ${path}`);assert.equal(response.body.total,expected);
    }
    const hidden=await request(app).get(`/api/vehicles?search=${encodeURIComponent(scope==='AGENCY'?seed[1].vin:seed[2].vin)}`).set('Authorization',token);
    assert.equal(hidden.body.items.length,scope==='GLOBAL'?1:0,`${scope}: une recherche ciblée doit rester dans le scope`);
    const stats=await request(app).get('/api/vehicles/stats').set('Authorization',token);expectStatus(stats.status,200,`${scope} KPI`);assert.equal(stats.body.total,expected);
  });

  for(const scope of ['AGENCY','CONCESSION','GLOBAL'] as const)for(const agency of [A1,A2,B1])test(`vehicles.view ${scope}: détail ${agency}`,async()=>{
    const response=await request(app).get(`/api/vehicles/${ids[agency]}`).set('Authorization',bearer([{code:'vehicles.view',scope}]));
    expectStatus(response.status,allowed(scope,agency)?200:404,`${scope} détail ${agency}`);
  });

  for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const)for(const agency of [A1,A2,B1])test(`vehicles.create ${scope}: agence ${agency}`,async()=>{
    const vins:Record<string,string>={[A1]:'WVWZZZ1JZXW009011',[A2]:'WVWZZZ1JZXW009012',[B1]:'WVWZZZ1JZXW009021'};
    const response=await request(app).post('/api/vehicles').set('Authorization',bearer([{code:'vehicles.create',scope}])).send({vin:vins[agency],brand:'Runtime',model:'Scope',agencyId:agency,status:'received',images:[{name:'runtime.jpg',dataUrl:'data:image/jpeg;base64,/9j/2wE='}]});
    const expected=scope==='OWN'?403:allowed(scope,agency)?201:403;
    expectStatus(response.status,expected,`${scope} création ${agency}`);
  });
  test('vehicles.create OWN ne doit rien persister avant son refus NON APPLICABLE',async()=>{
    const before=vehicles.length;
    const response=await request(app).post('/api/vehicles').set('Authorization',bearer([{code:'vehicles.create',scope:'OWN'}])).send({vin:'WVWZZZ1JZXW009099',brand:'Runtime',model:'Scope',agencyId:A1,status:'received',images:[{name:'runtime.jpg',dataUrl:'data:image/jpeg;base64,/9j/2wE='}]});
    expectStatus(response.status,403,'OWN création');assert.equal(vehicles.length,before,'un refus OWN ne doit jamais créer le véhicule');
  });
  test('vehicles.create ne doit pas accepter un prix d’achat sans vehicles.financials.view',async()=>{
    const response=await request(app).post('/api/vehicles').set('Authorization',bearer([{code:'vehicles.create',scope:'AGENCY'}])).send({vin:'WVWZZZ1JZXW009098',brand:'Runtime',model:'Scope',agencyId:A1,status:'received',purchasePrice:999,images:[{name:'runtime.jpg',dataUrl:'data:image/jpeg;base64,/9j/2wE='}]});
    expectStatus(response.status,403,'création financière sans permission secondaire');
  });

  for(const permission of ['vehicles.update','vehicles.status.update','vehicles.archive','vehicles.images.manage'] as const)for(const scope of ['OWN','AGENCY','CONCESSION','GLOBAL'] as const)for(const agency of [A1,A2,B1])test(`${permission} ${scope}: ${agency}`,async()=>{
    const token=bearer([{code:permission,scope}]),id=ids[agency];
    const response=permission==='vehicles.update'?await request(app).patch(`/api/vehicles/${id}`).set('Authorization',token).send({notes:'runtime'}):permission==='vehicles.status.update'?await request(app).patch(`/api/vehicles/${id}/status`).set('Authorization',token).send({status:'preparation'}):permission==='vehicles.archive'?await request(app).delete(`/api/vehicles/${id}`).set('Authorization',token):await request(app).patch(`/api/vehicles/${id}/images/1/primary`).set('Authorization',token);
    const expected=scope==='OWN'?403:allowed(scope,agency)?200:404;expectStatus(response.status,expected,`${permission} ${scope} ${agency}`);
  });

  for(const scope of ['AGENCY','CONCESSION','GLOBAL'] as const)for(const agency of [A1,A2,B1])test(`vehicles.images.manage delete ${scope}: parent ${agency}`,async()=>{
    const response=await request(app).delete(`/api/vehicles/${ids[agency]}/images/1`).set('Authorization',bearer([{code:'vehicles.images.manage',scope}]));
    expectStatus(response.status,allowed(scope,agency)?200:404,`suppression image ${scope} ${agency}`);
  });

  test('données financières: absence de vehicles.financials.view masque la lecture et ignore la modification',async()=>{
    const view=await request(app).get('/api/vehicles/201').set('Authorization',bearer([{code:'vehicles.view',scope:'AGENCY'}]));
    assert.equal(Object.hasOwn(view.body,'purchasePrice'),false);
    const update=await request(app).patch('/api/vehicles/201').set('Authorization',bearer([{code:'vehicles.update',scope:'AGENCY'}])).send({purchasePrice:999});
    expectStatus(update.status,403,'modification financière sans permission secondaire');assert.equal(vehicles[0].purchase_price,10);
  });
  test('données financières: permission présente expose et permet la modification dans l’intersection AGENCY',async()=>{
    const permissions:TestPermission[]=[{code:'vehicles.view',scope:'AGENCY'},{code:'vehicles.update',scope:'AGENCY'},{code:'vehicles.financials.view',scope:'AGENCY'}];
    const token=bearer(permissions),view=await request(app).get('/api/vehicles/201').set('Authorization',token);assert.equal(view.body.purchasePrice,10);
    const update=await request(app).patch('/api/vehicles/201').set('Authorization',token).send({purchasePrice:999});expectStatus(update.status,200,'finance A1');assert.equal(vehicles[0].purchase_price,999);
  });
  test('données financières: le scope financier AGENCY ne doit pas autoriser une écriture A2 via update CONCESSION',async()=>{
    const response=await request(app).patch('/api/vehicles/202').set('Authorization',bearer([{code:'vehicles.update',scope:'CONCESSION'},{code:'vehicles.financials.view',scope:'AGENCY'}])).send({purchasePrice:999});
    expectStatus(response.status,403,'intersection scope financier AGENCY / update CONCESSION');
  });
  for(const scenario of [
    {update:'CONCESSION',finance:'AGENCY',agency:A1,status:200},
    {update:'CONCESSION',finance:'CONCESSION',agency:A2,status:200},
    {update:'GLOBAL',finance:'CONCESSION',agency:B1,status:403},
    {update:'GLOBAL',finance:'GLOBAL',agency:B1,status:200},
  ] as const)test(`intersection update=${scenario.update} finance=${scenario.finance} cible=${scenario.agency}`,async()=>{
    const response=await request(app).patch(`/api/vehicles/${ids[scenario.agency]}`).set('Authorization',bearer([{code:'vehicles.update',scope:scenario.update},{code:'vehicles.financials.view',scope:scenario.finance}])).send({purchasePrice:777});
    expectStatus(response.status,scenario.status,`finance composite ${scenario.agency}`);
  });

  for(const scenario of [
    {create:'AGENCY',finance:'AGENCY',agency:A1,status:201},
    {create:'CONCESSION',finance:'AGENCY',agency:A2,status:403},
    {create:'CONCESSION',finance:'CONCESSION',agency:A2,status:201},
    {create:'GLOBAL',finance:'CONCESSION',agency:B1,status:403},
    {create:'GLOBAL',finance:'GLOBAL',agency:B1,status:201},
  ] as const)test(`intersection create=${scenario.create} finance=${scenario.finance} cible=${scenario.agency}`,async()=>{
    const before=vehicles.length,vin=`WVWZZZ1JZXW${String(800000+Number(scenario.agency)+scenario.status).padStart(6,'0').slice(-6)}`;
    const response=await request(app).post('/api/vehicles').set('Authorization',bearer([{code:'vehicles.create',scope:scenario.create},{code:'vehicles.financials.view',scope:scenario.finance}])).send({vin,brand:'Runtime',model:'Finance',agencyId:scenario.agency,status:'received',purchasePrice:777,images:[{name:'runtime.jpg',dataUrl:'data:image/jpeg;base64,/9j/2wE='}]});
    expectStatus(response.status,scenario.status,`create finance composite ${scenario.agency}`);assert.equal(vehicles.length,before+(scenario.status===201?1:0),'atomicité création financière');
  });

  for(const scope of ['AGENCY','CONCESSION','GLOBAL'] as const)for(const [source,target] of [[A1,A2],[A1,B1],[A2,A1],[B1,A1]] as const)test(`vehicles.assign_agency ${scope}: ${source} -> ${target}`,async()=>{
    const response=await request(app).post(`/api/vehicles/${ids[source]}/transfer`).set('Authorization',bearer([{code:'vehicles.assign_agency',scope}])).send({toAgencyId:target,reason:'Recette'});
    const sourceAllowed=allowed(scope,source),targetAllowed=scope==='GLOBAL'||scope==='CONCESSION'&&target!==B1||scope==='AGENCY'&&target===A1;
    expectStatus(response.status,sourceAllowed&&targetAllowed?200:sourceAllowed?403:404,`transfert ${scope} ${source}->${target}`);
  });
});
