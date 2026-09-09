import assert from'node:assert/strict';
import{after,before,test}from'node:test';
import jwt from'jsonwebtoken';
import request from'supertest';
import{createApp}from'../src/app.js';
import{env}from'../src/config/env.js';
import{pool}from'../src/config/database.js';

const original=pool.execute.bind(pool);let lastSql='',lastParams:unknown[]=[];
const token=(role:string,id='100')=>jwt.sign({sub:id,email:'test@lca.cg',roles:[role],agencyId:'1'},env.jwt.accessSecret,{expiresIn:'5m'});
before(()=>{(pool as any).execute=async(sql:string,params:unknown[]=[])=>{lastSql=sql;lastParams=params;if(sql.includes('FROM sales s JOIN customers c')&&sql.includes("s.status='ready"))return[[{sale_id:'10',sale_number:'V-10',customer_id:'20',salesperson_id:'100',agency_id:'1',status:'ready_for_delivery',total:10_000_000,balance_due:0,customer_name:'Client Test',vehicle_id:'30',vehicle_label:'LCA One',salesperson_name:'Elion'}],[]];if(sql.includes('FROM invoices i JOIN customers c'))return[[],[]];return[[],[]]}});
after(()=>{(pool as any).execute=original});
test('DELIVERY-01/02/03 le handoff expose au commercial propriétaire le bon dossier complet',async()=>{const response=await request(createApp()).get('/api/deliveries/candidates').set('Authorization',`Bearer ${token('SALES_AGENT')}`);assert.equal(response.status,200);assert.equal(response.body[0].sale_id,'10');assert.equal(response.body[0].customer_id,'20');assert.equal(response.body[0].vehicle_id,'30');assert.equal(response.body[0].salesperson_id,'100');assert.match(lastSql,/s\.salesperson_id=\?/);assert.ok(lastParams.includes('100'))});
test('la liste financière accepte le filtre saleId et conserve le scope agence',async()=>{const response=await request(createApp()).get('/api/invoices?saleId=10').set('Authorization',`Bearer ${token('ACCOUNTANT','200')}`);assert.equal(response.status,200);assert.match(lastSql,/i\.sale_id=\?/);assert.deepEqual(lastParams,['1','10'])});
