import assert from 'node:assert/strict';
import {after,before,beforeEach,test} from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import type {PoolConnection} from 'mysql2/promise';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {pool} from '../src/config/database.js';
import {markCrmTestDriveStarted,requireCrmAppointmentForTestDrive} from '../src/modules/showroom/showroom-test-drive.js';

function appointmentConnection(stage:string,hasAppointment:boolean){
  const writes:string[]=[];
  const connection={execute:async(sql:string)=>{if(sql.includes('SELECT o.id,o.stage'))return[[{id:'20',stage,has_valid_appointment:hasAppointment?1:0}],[]];writes.push(sql);return[{affectedRows:1},[]]}} as unknown as PoolConnection;
  return{connection,writes};
}

test('A1 qualified sans rendez-vous refuse l’essai et ne change pas le stage',async()=>{const{connection,writes}=appointmentConnection('qualified',false);await assert.rejects(()=>requireCrmAppointmentForTestDrive(connection,'10'),(error:any)=>error.status===409);assert.equal(writes.length,0)});
test('A2 appointment avec rendez-vous valide autorise puis passe à test_drive',async()=>{const{connection,writes}=appointmentConnection('appointment',true);const opportunityId=await requireCrmAppointmentForTestDrive(connection,'10');await markCrmTestDriveStarted(connection,opportunityId);assert.equal(opportunityId,'20');assert.equal(writes.length,1);assert.match(writes[0]!,/stage='test_drive'.*stage='appointment'/)});
test('A3 contacted refuse l’essai CRM',async()=>{const{connection,writes}=appointmentConnection('contacted',true);await assert.rejects(()=>requireCrmAppointmentForTestDrive(connection,'10'),(error:any)=>error.status===409);assert.equal(writes.length,0)});
test('A4 un essai Showroom sans opportunité CRM conserve le comportement historique',async()=>{let calls=0;const connection={execute:async()=>{calls++;return[[],[]]}} as unknown as PoolConnection;assert.equal(await requireCrmAppointmentForTestDrive(connection,null),null);await markCrmTestDriveStarted(connection,null);assert.equal(calls,0)});

const originalExecute=pool.execute.bind(pool),originalGetConnection=pool.getConnection.bind(pool);
let quote={id:'50',quotation_number:'DEV-50',opportunity_id:'20',customer_id:'30',agency_id:'1',created_by:'200',created_by_name:'Manager Un',commercial_owner_id:'100',commercial_owner_name:'Agent A',status:'draft',valid_until:null,subtotal:10000000,discount_total:0,tax_total:0,total:10000000,notes:null,created_at:'2026-09-08',vehicle_id:'40',vehicle_label:'LCA One',stock_number:'ST-40',description:'Véhicule',quantity:1,unit_price:10000000,discount:0,tax_rate:0,line_total:10000000,sale_price:10000000};
let capturedSalespersonId:string|null=null,quotationAudited=false;
const token=(role:string,id:string,agencyId:string|null)=>jwt.sign({sub:id,email:`${id}@test.local`,roles:[role],agencyId},env.jwt.accessSecret,{expiresIn:'5m'});

before(()=>{
  (pool as any).execute=async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('FROM quotations q')&&sql.includes('WHERE q.id=?'))return String(params[0])===quote.id?[[quote],[]]:[[],[]];
    if(sql.includes('FROM quotations q'))return[sql.includes('o.assigned_user_id=?')&&String(params.at(-1))!==quote.commercial_owner_id?[]:[quote],[]];
    if(sql.includes('FROM sales s')){const row={id:'70',sale_number:'V-70',agency_id:'1',customer_id:'30',salesperson_id:'100'};if(sql.includes('s.salesperson_id=?')&&!params.map(String).includes('100'))return[[],[]];return[[row],[]]}
    return[[],[]];
  };
  (pool as any).getConnection=async()=>({beginTransaction:async()=>{},commit:async()=>{},rollback:async()=>{},release:()=>{},execute:async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('SELECT q.*')&&sql.includes('FOR UPDATE'))return[[{...quote,lead_id:'10'}],[]];
    if(sql.includes('SELECT id FROM agencies'))return[[{id:'1'}],[]];
    if(sql.includes('FROM customers WHERE'))return[[{id:'30',agency_id:'1'}],[]];
    if(sql.includes('FROM vehicles WHERE'))return[[{id:'40',agency_id:'1',status:'available',vin:'VIN40',stock_number:'ST-40',catalog_price:10000000,sale_price:10000000}],[]];
    if(sql.includes('FROM opportunities WHERE'))return[[{id:'20',lead_id:'10',customer_id:'30',assigned_user_id:'100',stage:'offer'}],[]];
    if(sql.includes('FROM quotations q JOIN quotation_items'))return[[quote],[]];
    if(sql.includes('FROM users u JOIN user_roles'))return[[{id:'100'}],[]];
    if(sql.includes('SELECT id FROM sales')||sql.includes('FROM reservations WHERE'))return[[],[]];
    if(sql.includes("UPDATE quotations SET status='sent'")){quote={...quote,status:'sent'};return[{affectedRows:1},[]]}
    if(sql.includes("INSERT INTO audit_logs")&&sql.includes("'quotations'")){quotationAudited=true;return[{affectedRows:1},[]]}
    if(sql.includes('INSERT INTO sales(')){capturedSalespersonId=String(params[5]);return[{insertId:70,affectedRows:1},[]]}
    return[{affectedRows:1},[]];
  }});
});
after(()=>{(pool as any).execute=originalExecute;(pool as any).getConnection=originalGetConnection});
beforeEach(()=>{quote={...quote,agency_id:'1',created_by:'200',created_by_name:'Manager Un',commercial_owner_id:'100',commercial_owner_name:'Agent A',status:'draft'};capturedSalespersonId=null;quotationAudited=false});

test('B1/B2 le propriétaire lit et modifie un devis créé par son manager',async()=>{const auth=`Bearer ${token('SALES_AGENT','100','1')}`;const read=await request(createApp()).get('/api/quotations/50').set('Authorization',auth);assert.equal(read.status,200);assert.equal(read.body.salespersonId,'100');assert.equal(read.body.createdById,'200');const update=await request(createApp()).patch('/api/quotations/50').set('Authorization',auth).send({discount:50000});assert.equal(update.status,200)});
test('B3 un autre commercial de la même agence est refusé en lecture et modification',async()=>{const auth=`Bearer ${token('SALES_AGENT','101','1')}`;assert.equal((await request(createApp()).get('/api/quotations/50').set('Authorization',auth)).status,403);assert.equal((await request(createApp()).patch('/api/quotations/50').set('Authorization',auth).send({discount:1})).status,403)});
test('B3 la liste SALES_AGENT suit opportunity.assigned_user_id',async()=>{const own=await request(createApp()).get('/api/quotations').set('Authorization',`Bearer ${token('SALES_AGENT','100','1')}`),other=await request(createApp()).get('/api/quotations').set('Authorization',`Bearer ${token('SALES_AGENT','101','1')}`);assert.equal(own.body.length,1);assert.equal(other.body.length,0)});
test('B4 le manager de la même agence accède au devis',async()=>{const auth=`Bearer ${token('SALES_MANAGER','200','1')}`;assert.equal((await request(createApp()).get('/api/quotations/50').set('Authorization',auth)).status,200);assert.equal((await request(createApp()).patch('/api/quotations/50').set('Authorization',auth).send({notes:'Validé'})).status,200)});
test('B4 un manager d’une autre agence est refusé',async()=>{const auth=`Bearer ${token('SALES_MANAGER','201','2')}`;assert.equal((await request(createApp()).get('/api/quotations/50').set('Authorization',auth)).status,403);assert.equal((await request(createApp()).patch('/api/quotations/50').set('Authorization',auth).send({notes:'Non'})).status,403)});
test('B5 une transformation par le manager conserve le propriétaire de l’opportunité',async()=>{const response=await request(createApp()).post('/api/sales').set('Authorization',`Bearer ${token('SALES_MANAGER','200','1')}`).send({customerId:'30',vehicleId:'40',opportunityId:'20',quotationId:'50',salespersonId:'200',discount:0,depositAmount:0,idempotencyKey:'manager-transform-50'});assert.equal(response.status,201);assert.equal(capturedSalespersonId,'100')});
test('le manager valide le devis sans devenir propriétaire et l’action est auditée',async()=>{const response=await request(createApp()).post('/api/quotations/50/validate').set('Authorization',`Bearer ${token('SALES_MANAGER','200','1')}`);assert.equal(response.status,200);assert.equal(response.body.status,'sent');assert.equal(response.body.salespersonId,'100');assert.equal(quotationAudited,true)});
test('le commercial propriétaire peut émettre son devis sans validation hiérarchique',async()=>{const response=await request(createApp()).post('/api/quotations/50/validate').set('Authorization',`Bearer ${token('SALES_AGENT','100','1')}`);assert.equal(response.status,200);assert.equal(response.body.status,'sent');assert.equal(response.body.salespersonId,'100');assert.equal(quotationAudited,true)});
test('un autre commercial ne peut pas émettre le devis',async()=>{const response=await request(createApp()).post('/api/quotations/50/validate').set('Authorization',`Bearer ${token('SALES_AGENT','101','1')}`);assert.equal(response.status,403);assert.equal(quote.status,'draft')});
test('le propriétaire peut produire le PDF réel de son devis',async()=>{const response=await request(createApp()).get('/api/quotations/50/pdf').set('Authorization',`Bearer ${token('SALES_AGENT','100','1')}`).buffer(true);assert.equal(response.status,200);assert.match(response.headers['content-type'],/application\/pdf/);assert.equal(response.body.subarray(0,5).toString(),'%PDF-')});
test('le commercial ne voit que ses ventes, le manager voit celles de son agence',async()=>{const own=await request(createApp()).get('/api/sales').set('Authorization',`Bearer ${token('SALES_AGENT','100','1')}`),other=await request(createApp()).get('/api/sales').set('Authorization',`Bearer ${token('SALES_AGENT','101','1')}`),manager=await request(createApp()).get('/api/sales').set('Authorization',`Bearer ${token('SALES_MANAGER','200','1')}`);assert.equal(own.body.length,1);assert.equal(other.body.length,0);assert.equal(manager.body.length,1)});
test('la réaffectation post-vente est refusée même au manager sans règle métier explicite',async()=>{const response=await request(createApp()).patch('/api/sales/70').set('Authorization',`Bearer ${token('SALES_MANAGER','200','1')}`).send({salespersonId:'101'});assert.equal(response.status,409);assert.equal(response.body.message,'La réaffectation d’une vente créée nécessite une règle métier explicite')});
