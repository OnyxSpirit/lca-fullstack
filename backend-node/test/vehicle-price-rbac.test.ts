import assert from 'node:assert/strict';
import {after,before,test} from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {pool} from '../src/config/database.js';

const row:any={id:1,vin:'VF1TEST00000000001',stock_number:'STK-000001',registration_number:null,vehicle_type:'new',body_type:'SUV',year:2025,first_registration_date:null,color:'Noir',interior_color:'Noir',fuel_type:'Essence',engine:'2.0',transmission:'Automatique',fiscal_power:10,real_power:150,co2_emissions:100,mileage:0,status:'available',entry_date:'2026-09-01',notes:null,brand_id:1,brand:'LCA',model_id:1,model:'One',version_id:1,version:'Premium',agency_id:1,agency_name:'Agence',location_id:null,location_name:null,supplier_id:null,supplier_name:null,created_by:1,created_by_name:'Admin',primary_image:null,created_at:'2026-09-01',updated_at:'2026-09-01',purchase_price:10000000,refurbishment_cost:100000,transport_cost:200000,administrative_cost:50000,additional_costs:25000,catalog_price:16000000,sale_price:15500000,minimum_price:14500000,discount:500000};

const originalExecute=pool.execute.bind(pool);
before(()=>{(pool as any).execute=async(sql:string)=>sql.includes('FROM vehicles v JOIN versions')?[[row],[]]:sql.includes('SELECT COUNT(*) total')?[[{total:1,ordered:0,in_transit:0,received:0,preparation:0,available:1,reserved:0,sold:0,delivered:0,dormant:0,stock_value:15500000}],[]]:[[],[]]});
after(()=>{(pool as any).execute=originalExecute});
const token=(role:string)=>jwt.sign({sub:'10',email:'role@lca.local',roles:[role],agencyId:'1'},env.jwt.accessSecret,{expiresIn:'5m'});

test('la route véhicules donne au RECEPTIONIST le prix public sans coûts internes',async()=>{
  const response=await request(createApp()).get('/api/vehicles/1').set('Authorization',`Bearer ${token('RECEPTIONIST')}`);
  assert.equal(response.status,200);assert.equal(response.body.salePrice,15500000);assert.equal(response.body.catalogPrice,16000000);
  for(const field of ['purchasePrice','refurbishmentCost','transportCost','administrativeCost','additionalCosts','minimumPrice','discount'])assert.equal(Object.hasOwn(response.body,field),false,field);
});

test('la route véhicules donne au SALES_AGENT les prix commerciaux sans coûts internes',async()=>{
  const response=await request(createApp()).get('/api/vehicles/1').set('Authorization',`Bearer ${token('SALES_AGENT')}`);
  assert.equal(response.status,200);assert.equal(response.body.salePrice,15500000);assert.equal(response.body.catalogPrice,16000000);assert.equal(Object.hasOwn(response.body,'purchasePrice'),false);
});

test('la route conserve les données financières pour SALES_MANAGER, DIRECTOR et SUPER_ADMIN',async()=>{
  for(const role of ['SALES_MANAGER','DIRECTOR','SUPER_ADMIN']){
    const response=await request(createApp()).get('/api/vehicles/1').set('Authorization',`Bearer ${token(role)}`);
    assert.equal(response.status,200,role);assert.equal(response.body.salePrice,15500000,role);assert.equal(response.body.purchasePrice,10000000,role);assert.equal(response.body.minimumPrice,14500000,role);
  }
});

test('/vehicles/stats masque stockValue au RECEPTIONIST et le conserve au SALES_MANAGER',async()=>{
  const receptionist=await request(createApp()).get('/api/vehicles/stats').set('Authorization',`Bearer ${token('RECEPTIONIST')}`);
  assert.equal(receptionist.status,200);assert.equal(Object.hasOwn(receptionist.body,'stockValue'),false);
  const manager=await request(createApp()).get('/api/vehicles/stats').set('Authorization',`Bearer ${token('SALES_MANAGER')}`);
  assert.equal(manager.status,200);assert.equal(manager.body.stockValue,15500000);
});
