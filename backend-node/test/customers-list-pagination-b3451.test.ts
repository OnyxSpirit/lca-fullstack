import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {pool} from '../src/config/database.js';
import {issueTestAccessToken} from './helpers/auth-session-fixture.js';

const originalExecute=pool.execute.bind(pool);
const token=()=>issueTestAccessToken({userId:'10',email:'agent@lca.local',roles:['CUSTOMER_LIST_TEST'],agencyId:'1',permissions:[{code:'customers.view',scope:'AGENCY'}]});
const rows=Array.from({length:32},(_,index)=>({
  id:String(index+1),customer_code:`CLI-${String(index+1).padStart(6,'0')}`,customer_type:'individual',civility:'M.',first_name:`Client ${index+1}`,last_name:'Test',company_name:null,email:`client${index+1}@example.test`,phone:'+242060000000',secondary_phone:null,address:null,postal_code:null,city:'Brazzaville',country:'Congo',tax_identifier:null,source:null,segment:null,score:0,classification:'occasional',notes:null,agency_id:'1',agency_name:'Agence test',assigned_user_id:'10',assigned_user_name:'Agent Test',created_by:'10',created_by_name:'Agent Test',total_revenue:0,open_balance:0,created_at:'2026-10-01 10:00:00',updated_at:`2026-10-${String(32-index).padStart(2,'0')} 10:00:00`,
}));
let listSql:string[]=[];

before(()=>{(pool as any).execute=async(sql:string,params:unknown[]=[])=>{
  if(sql.includes('SELECT r.id,r.code,r.is_system'))return[[{id:'role-test',code:'CUSTOMER_LIST_TEST',is_system:0}],[]];
  if(sql.includes('SELECT p.code,rp.scope'))return[[{code:'customers.view',scope:'AGENCY'}],[]];
  if(sql.startsWith('SELECT COUNT(*) total FROM customers c'))return[[{total:rows.length}],[]];
  if(sql.includes('FROM customers c JOIN agencies a')){
    listSql.push(sql);
    if(sql.includes('LIMIT ? OFFSET ?')){const size=Number(params.at(-2)),offset=Number(params.at(-1));return[rows.slice(offset,offset+size),[]];}
    return[rows.slice(0,200),[]];
  }
  return[[],[]];
};});
after(()=>{(pool as any).execute=originalExecute;});

test('GET /customers pagine côté serveur et conserve le total territorial',async()=>{
  const response=await request(createApp()).get('/api/customers?page=2&pageSize=15').set('Authorization',`Bearer ${token()}`);
  assert.equal(response.status,200);
  assert.deepEqual({total:response.body.total,page:response.body.page,pageSize:response.body.pageSize,totalPages:response.body.totalPages},{total:32,page:2,pageSize:15,totalPages:3});
  assert.equal(response.body.items.length,15);
  assert.equal(response.body.items[0].id,'16');
  assert.match(listSql.at(-1)??'',/ORDER BY c\.updated_at DESC,c\.id DESC LIMIT \? OFFSET \?/);
});

test('GET /customers borne une page hors plage sans doublonner la requête métier',async()=>{
  const response=await request(createApp()).get('/api/customers?page=99&pageSize=15').set('Authorization',`Bearer ${token()}`);
  assert.equal(response.status,200);
  assert.equal(response.body.page,3);
  assert.equal(response.body.items.length,2);
  assert.deepEqual(response.body.items.map((item:{id:string})=>item.id),['31','32']);
});

test('GET /customers sans paramètres conserve le contrat historique en tableau',async()=>{
  const response=await request(createApp()).get('/api/customers').set('Authorization',`Bearer ${token()}`);
  assert.equal(response.status,200);
  assert.ok(Array.isArray(response.body));
  assert.equal(response.body.length,32);
});
