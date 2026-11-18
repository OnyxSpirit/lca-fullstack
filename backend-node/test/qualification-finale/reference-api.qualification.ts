import assert from 'node:assert/strict';
import {test} from 'node:test';

const base=process.env.QUALIFICATION_API_URL;
assert.equal(base,'http://127.0.0.1:3105','La recette doit cibler exclusivement l API locale isolée');

async function request(path:string,options:RequestInit={}){
  const response=await fetch(`${base}/api${path}`,options);
  const text=await response.text();
  const body=text?JSON.parse(text):null;
  return{response,body};
}

async function login(email:string){
  const{response,body}=await request('/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email,password:'Qualification!2026'})});
  assert.equal(response.status,200,JSON.stringify(body));
  assert.equal(typeof body.accessToken,'string');
  return body.accessToken as string;
}

const auth=(token:string)=>({authorization:`Bearer ${token}`});

test('QF-API-01 le scope OWN ne retourne que le portefeuille du titulaire',async()=>{
  const token=await login('qf.own@qualification.invalid');
  const{response,body}=await request('/customers',{headers:auth(token)});
  assert.equal(response.status,200,JSON.stringify(body));
  assert.deepEqual(body.map((customer:{customerCode:string})=>customer.customerCode),['QF-CUST-OWN-A']);
});

test('QF-API-02 le scope AGENCY voit toute l agence active mais jamais l agence voisine',async()=>{
  const token=await login('qf.agency@qualification.invalid');
  const{response,body}=await request('/customers',{headers:auth(token)});
  assert.equal(response.status,200,JSON.stringify(body));
  assert.deepEqual(new Set(body.map((customer:{customerCode:string})=>customer.customerCode)),new Set(['QF-CUST-OWN-A','QF-CUST-OTHER-A']));
  assert.equal(body.some((customer:{customerCode:string})=>customer.customerCode==='QF-CUST-B'),false);
});

test('QF-API-03 le changement d agence est explicite et recalcule les permissions',async()=>{
  const token=await login('qf.agency@qualification.invalid');
  const context=await request('/rbac/agency-context',{headers:auth(token)});
  assert.equal(context.response.status,200,JSON.stringify(context.body));
  const beta=context.body.agencies.find((agency:{code:string})=>agency.code==='QF_BETA');
  assert.ok(beta);
  const switched=await request('/rbac/agency-context',{method:'PUT',headers:{...auth(token),'content-type':'application/json'},body:JSON.stringify({agencyId:beta.agencyId})});
  assert.equal(switched.response.status,200,JSON.stringify(switched.body));
  assert.equal(switched.body.activeAgencyId,beta.agencyId);
  const customers=await request('/customers',{headers:auth(token)});
  assert.equal(customers.response.status,200,JSON.stringify(customers.body));
  assert.deepEqual(customers.body.map((customer:{customerCode:string})=>customer.customerCode),['QF-CUST-B']);
});

test('QF-API-04 un filtre agence hostile ne permet pas de sortir du contexte actif',async()=>{
  const token=await login('qf.agency@qualification.invalid');
  const context=await request('/rbac/agency-context',{headers:auth(token)});
  const beta=context.body.agencies.find((agency:{code:string})=>agency.code==='QF_BETA');
  const{response,body}=await request(`/customers?agencyId=${encodeURIComponent(beta.agencyId)}`,{headers:auth(token)});
  assert.equal(response.status,200,JSON.stringify(body));
  assert.equal(body.some((customer:{customerCode:string})=>customer.customerCode==='QF-CUST-B'),false);
});
