import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import jwt from 'jsonwebtoken';
import supertest from 'supertest';
import {createApp} from '../src/app.js';
import {pool,query,execute} from '../src/config/database.js';
import type {RowDataPacket} from 'mysql2/promise';

const enabled=process.env.LCA_REPORT_DB_TEST==='1';
if(enabled)after(async()=>{await pool.end()});

test('Reporting MySQL 8.4 : réconciliation, scopes et CSV sur données persistées',{skip:!enabled},async()=>{
  const [existing]=await query<RowDataPacket[]>("SELECT id FROM agencies WHERE code='REP-A'");
  if(existing)return;
  const insert=async(sql:string,params:unknown[]=[])=>String((await execute(sql,params)).insertId);
  const api=supertest(createApp());
  const group=await insert('INSERT INTO groups_company(name,code) VALUES(?,?)',['Audit Reporting','REP-G']);
  const concessionX=await insert('INSERT INTO concessions(group_id,name,code) VALUES(?,?,?)',[group,'Concession X','REP-X']);
  const concessionY=await insert('INSERT INTO concessions(group_id,name,code) VALUES(?,?,?)',[group,'Concession Y','REP-Y']);
  const agencyA=await insert('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[concessionX,'Agence A','REP-A']);
  const agencyB=await insert('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[concessionX,'Agence B','REP-B']);
  const agencyC=await insert('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[concessionY,'Agence C','REP-C']);
  const scopes=['AGENCY','CONCESSION','GLOBAL'] as const;
  const actors:Record<string,{id:string;token:string}>={};
  for(const scope of scopes){
    const role=await insert('INSERT INTO roles(name,code) VALUES(?,?)',[`Audit ${scope}`,`REP_${scope}`]);
    const user=await insert('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[agencyA,'Audit',scope,`rep-${scope.toLowerCase()}@example.test`,'test']);
    await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[user,role]);
    for(const code of ['reporting.view','reporting.export','billing.view','sales.view','vehicles.financials.view','workshop.productivity.view','parts.reporting.view']){
      const [permission]=await query<RowDataPacket[]>('SELECT id FROM permissions WHERE code=?',[code]);assert.ok(permission,code);
      await pool.execute('INSERT INTO role_permissions(role_id,permission_id,scope) VALUES(?,?,?)',[role,permission.id,scope]);
    }
    actors[scope]={id:user,token:jwt.sign({sub:user,email:`rep-${scope.toLowerCase()}@example.test`,roles:[],agencyId:agencyA},process.env.JWT_ACCESS_SECRET!)};
  }
  const mixedRole=await insert('INSERT INTO roles(name,code) VALUES(?,?)',['Audit mixte','REP_MIXED']);
  const mixedUser=await insert('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[agencyA,'Audit','Mixte','rep-mixed@example.test','test']);
  await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[mixedUser,mixedRole]);
  for(const [code,scope] of [['reporting.view','GLOBAL'],['reporting.export','AGENCY'],['billing.view','AGENCY'],['sales.view','GLOBAL']] as const){const[p]=await query<RowDataPacket[]>('SELECT id FROM permissions WHERE code=?',[code]);await pool.execute('INSERT INTO role_permissions(role_id,permission_id,scope) VALUES(?,?,?)',[mixedRole,p.id,scope])}
  const mixedToken=jwt.sign({sub:mixedUser,email:'rep-mixed@example.test',roles:[],agencyId:agencyA},process.env.JWT_ACCESS_SECRET!);
  const customers:Record<string,string>={};
  for(const [key,agency] of [['A',agencyA],['B',agencyB],['C',agencyC]] as const){customers[key]=await insert('INSERT INTO customers(customer_code,agency_id,first_name,last_name) VALUES(?,?,?,?)',[`REP-${key}`,agency,'Client',key])}
  const invoice=async(name:string,agency:string,customer:string,total:number,status='issued')=>insert('INSERT INTO invoices(invoice_number,customer_id,agency_id,invoice_type,status,issue_date,due_date,total,balance_due) VALUES(?,?,?,? ,?, ?,?,?,?)',[`REP-INV-${name}`,customer,agency,'vehicle',status,'2026-09-15','2026-09-30',total,status==='cancelled'?0:total]);
  const invoiceA=await invoice('A',agencyA,customers.A,10_000_000);
  const invoiceB=await invoice('B',agencyB,customers.B,15_000_000);
  await invoice('C',agencyC,customers.C,20_000_000);
  await invoice('X',agencyB,customers.B,50_000_000,'cancelled');
  await invoice('DRAFT',agencyA,customers.A,30_000_000,'draft');
  await pool.execute('INSERT INTO credit_notes(credit_note_number,invoice_id,customer_id,status,reason,amount,issue_date) VALUES(?,?,?,?,?,?,?)',['REP-CN-B',invoiceB,customers.B,'applied','Réduction',2_000_000,'2026-09-15']);
  const [paymentMethod]=await query<RowDataPacket[]>('SELECT id FROM payment_methods LIMIT 1');
  await pool.execute('INSERT INTO payments(payment_number,invoice_id,customer_id,payment_method_id,amount,payment_date,status) VALUES(?,?,?,?,?,?,?)',['REP-PAY-A',invoiceA,customers.A,paymentMethod.id,4_000_000,'2026-09-15 12:00:00','confirmed']);
  await pool.execute('INSERT INTO payments(payment_number,invoice_id,customer_id,payment_method_id,amount,payment_date,status,refunded_at) VALUES(?,?,?,?,?,?,?,?)',['REP-PAY-B',invoiceB,customers.B,paymentMethod.id,5_000_000,'2026-09-15 12:00:00','refunded','2026-10-05 12:00:00']);
  await pool.execute("UPDATE invoices SET amount_paid=4000000,balance_due=6000000,status='partially_paid' WHERE id=?",[invoiceA]);
  await pool.execute("UPDATE invoices SET balance_due=13000000 WHERE id=?",[invoiceB]);
  const get=(path:string,token:string)=>api.get(`/api/reports/${path}`).set('Authorization',`Bearer ${token}`);
  const period='from=2026-09-01&to=2026-09-30';
  const financeA=await get(`finance?${period}`,actors.AGENCY.token);
  const financeX=await get(`finance?${period}`,actors.CONCESSION.token);
  const financeG=await get(`finance?${period}`,actors.GLOBAL.token);
  assert.equal(financeA.status,200,JSON.stringify(financeA.body));assert.equal(financeA.body.net,10_000_000);
  assert.equal(financeA.body.invoices_count,1);
  assert.equal(financeX.body.net,23_000_000);assert.equal(financeG.body.net,43_000_000);
  assert.equal(financeX.body.invoices_count,2);
  assert.equal(financeX.body.collected,9_000_000);assert.equal(financeX.body.outstanding,19_000_000);
  const selectedB=await get(`finance?${period}&reportAgencyId=${agencyB}`,actors.CONCESSION.token);
  assert.equal(selectedB.status,200);assert.equal(selectedB.body.net,13_000_000);
  assert.equal((await get(`finance?${period}&reportAgencyId=${agencyC}`,actors.CONCESSION.token)).status,403);
  assert.equal((await get(`finance?${period}&reportAgencyId=${agencyB}`,actors.AGENCY.token)).status,403);
  assert.equal((await get(`finance?${period}&reportAgencyId=${agencyC}`,actors.GLOBAL.token)).body.net,20_000_000);
  const mixed=await get(`finance?${period}`,mixedToken);assert.equal(mixed.body.net,10_000_000);
  assert.equal((await get(`sales?${period}`,mixedToken)).status,403);
  const csv=await get(`export?section=finance&${period}`,actors.CONCESSION.token);
  assert.equal(csv.status,200);assert.match(csv.text,/"Facturation nette TTC";"23000000"/);assert.match(csv.text,/^\ufeff"Période du"/);
  assert.match((await get(`export?section=finance&${period}`,actors.AGENCY.token)).text,/"Facturation nette TTC";"10000000"/);
  assert.match((await get(`export?section=finance&${period}`,actors.GLOBAL.token)).text,/"Facturation nette TTC";"43000000"/);
  assert.match((await get(`export?section=finance&${period}&reportAgencyId=${agencyB}`,actors.CONCESSION.token)).text,/"Facturation nette TTC";"13000000"/);
  assert.equal((await get(`export?section=finance&${period}&reportAgencyId=${agencyB}`,mixedToken)).status,403);
  assert.equal((await get(`agencies?${period}`,actors.AGENCY.token)).status,403);
  const agenciesX=await get(`agencies?${period}`,actors.CONCESSION.token);
  assert.deepEqual(agenciesX.body.map((row:{agencyId:string})=>row.agencyId).sort(),[agencyA,agencyB].sort());
  assert.ok((await get(`agencies?${period}`,actors.GLOBAL.token)).body.some((row:{agencyId:string})=>row.agencyId===agencyC));
  const emptyPeriod=await get(`finance?from=2026-10-01&to=2026-10-01`,actors.GLOBAL.token);
  assert.equal(emptyPeriod.body.net,0);assert.deepEqual(emptyPeriod.body.ageing,[]);
  assert.equal((await get('finance?from=2026-10-01&to=2026-10-31',actors.GLOBAL.token)).body.collected,-5_000_000);
  assert.equal((await get(`finance?from=2026-09-15&to=2026-09-15`,actors.CONCESSION.token)).body.net,23_000_000);
  assert.match((await get('export?section=finance&from=2026-10-01&to=2026-10-01',actors.GLOBAL.token)).text,/"Facturation nette TTC";"0"/);
  const vehicle=await get(`vehicles?${period}`,actors.GLOBAL.token);assert.equal(vehicle.status,200,JSON.stringify(vehicle.body));assert.equal(vehicle.body.vn_stock,0);
  for(const section of ['overview','revenue','sales','salespeople','workshop','parts']){const response=await get(`${section}?${period}`,actors.GLOBAL.token);assert.equal(response.status,200,`${section}: ${JSON.stringify(response.body)}`)}
  const [viewPermission]=await query<RowDataPacket[]>("SELECT id FROM permissions WHERE code='reporting.view'");
  await pool.execute('UPDATE role_permissions SET scope=? WHERE role_id=? AND permission_id=?',['OWN',mixedRole,viewPermission.id]);
  assert.equal((await get(`finance?${period}`,mixedToken)).status,403);
  assert.ok(invoiceA);
});

test('Reporting MySQL 8.4 : ventes, marges, annulations et bornes de période',{skip:!enabled},async()=>{
  const [existingSale]=await query<RowDataPacket[]>("SELECT id FROM sales WHERE sale_number='REP-SALE-A'");
  if(existingSale)return;
  const insert=async(sql:string,params:unknown[]=[])=>String((await execute(sql,params)).insertId);
  const api=supertest(createApp());
  const ids:Record<string,string>={};
  for(const key of ['A','B','C']){const [agency]=await query<RowDataPacket[]>('SELECT id FROM agencies WHERE code=?',[`REP-${key}`]);ids[key]=String(agency.id)}
  const [actor]=await query<RowDataPacket[]>("SELECT id FROM users WHERE email='rep-concession@example.test'");
  const token=jwt.sign({sub:String(actor.id),email:'rep-concession@example.test',roles:[],agencyId:ids.A},process.env.JWT_ACCESS_SECRET!);
  const [globalActor]=await query<RowDataPacket[]>("SELECT id FROM users WHERE email='rep-global@example.test'");
  const globalToken=jwt.sign({sub:String(globalActor.id),email:'rep-global@example.test',roles:[],agencyId:ids.A},process.env.JWT_ACCESS_SECRET!);
  const brand=await insert('INSERT INTO brands(name,code) VALUES(?,?)',['Marque Reporting','REP-BRAND']);
  const model=await insert('INSERT INTO models(brand_id,name) VALUES(?,?)',[brand,'Modèle Reporting']);
  const version=await insert('INSERT INTO versions(model_id,name) VALUES(?,?)',[model,'Version Reporting']);
  for(const [key,total,cost,type,status] of [['A',10_000_000,8_000_000,'new','sold'],['B',15_000_000,10_000_000,'used','delivered'],['C',20_000_000,16_000_000,'new','sold']] as const){
    const [customer]=await query<RowDataPacket[]>('SELECT id FROM customers WHERE customer_code=?',[`REP-${key}`]);
    const vehicle=await insert('INSERT INTO vehicles(version_id,agency_id,vehicle_type,vin,status,purchase_price,entry_date) VALUES(?,?,?,?,?,?,?)',[version,ids[key],type,`REP-VIN-${key}`,status,cost,'2026-08-01']);
    const sale=await insert('INSERT INTO sales(sale_number,customer_id,agency_id,status,total,sold_at) VALUES(?,?,?,?,?,?)',[`REP-SALE-${key}`,customer.id,ids[key],'confirmed',total,'2026-11-15 12:00:00']);
    await pool.execute('INSERT INTO sale_items(sale_id,vehicle_id,description,line_total) VALUES(?,?,?,?)',[sale,vehicle,`Véhicule ${key}`,total]);
  }
  const [customer]=await query<RowDataPacket[]>("SELECT id FROM customers WHERE customer_code='REP-B'");
  await insert('INSERT INTO sales(sale_number,customer_id,agency_id,status,total,sold_at) VALUES(?,?,?,?,?,?)',['REP-SALE-CANCELLED',customer.id,ids.B,'cancelled',50_000_000,'2026-11-15 12:00:00']);
  const get=(path:string,bearer=token)=>api.get(`/api/reports/${path}`).set('Authorization',`Bearer ${bearer}`);
  const concession=await get('sales?from=2026-11-01&to=2026-11-30');
  assert.equal(concession.status,200,JSON.stringify(concession.body));
  assert.equal(concession.body.sales_count,2);assert.equal(concession.body.revenue,25_000_000);assert.equal(concession.body.margin,7_000_000);
  assert.equal(concession.body.vn_count,1);assert.equal(concession.body.vo_count,1);assert.equal(concession.body.delivered_count,1);
  const global=await get('sales?from=2026-11-01&to=2026-11-30',globalToken);
  assert.equal(global.body.sales_count,3);assert.equal(global.body.revenue,45_000_000);assert.equal(global.body.margin,11_000_000);
  assert.equal((await get('sales?from=2026-11-15&to=2026-11-15')).body.revenue,25_000_000);
  assert.equal((await get('sales?from=2026-11-16&to=2026-11-16')).body.revenue,0);
  assert.equal((await get('sales?from=2025-12-01&to=2026-12-31')).body.sales_count,2);
  const csv=await get('export?section=sales&from=2026-11-01&to=2026-11-30');
  assert.equal(csv.status,200);assert.match(csv.text,/"Montant des ventes TTC";"25000000"/);
});

test('Reporting MySQL 8.4 : stock actuel et CSV respectent chaque périmètre',{skip:!enabled},async()=>{
  const [existingStock]=await query<RowDataPacket[]>("SELECT id FROM vehicles WHERE vin='REP-STOCK-A'");
  const [version]=await query<RowDataPacket[]>("SELECT id FROM versions WHERE name='Version Reporting'");
  const agencies:Record<string,string>={};
  for(const key of ['A','B','C']){const [agency]=await query<RowDataPacket[]>('SELECT id FROM agencies WHERE code=?',[`REP-${key}`]);agencies[key]=String(agency.id)}
  if(!existingStock)for(const [key,type,cost] of [['A','new',5_000_000],['B','used',3_000_000],['C','new',7_000_000]] as const){await pool.execute('INSERT INTO vehicles(version_id,agency_id,vehicle_type,vin,status,purchase_price,entry_date) VALUES(?,?,?,?,?,?,?)',[version.id,agencies[key],type,`REP-STOCK-${key}`,'available',cost,'2026-08-01'])}
  const api=supertest(createApp());
  const actor=async(email:string)=>{const [user]=await query<RowDataPacket[]>('SELECT id FROM users WHERE email=?',[email]);return jwt.sign({sub:String(user.id),email,roles:[],agencyId:agencies.A},process.env.JWT_ACCESS_SECRET!)};
  const agencyToken=await actor('rep-agency@example.test'),concessionToken=await actor('rep-concession@example.test'),globalToken=await actor('rep-global@example.test');
  const get=(path:string,token:string)=>api.get(`/api/reports/${path}`).set('Authorization',`Bearer ${token}`);
  const period='from=2026-09-01&to=2026-09-30';
  const a=await get(`vehicles?${period}`,agencyToken),x=await get(`vehicles?${period}`,concessionToken),g=await get(`vehicles?${period}`,globalToken);
  assert.equal(a.body.stock_count,1);assert.equal(x.body.stock_count,2);assert.equal(g.body.stock_count,3);
  assert.equal(x.body.stock_value,8_000_000);assert.equal(x.body.vn_stock,1);assert.equal(x.body.vo_stock,1);
  assert.match((await get(`export?section=vehicles&${period}`,concessionToken)).text,/"Valeur du stock au coût";"8000000"/);
  const [existingTaxable]=await query<RowDataPacket[]>("SELECT id FROM sales WHERE sale_number='REP-TAXABLE'");
  if(!existingTaxable){
    const [customer]=await query<RowDataPacket[]>("SELECT id FROM customers WHERE customer_code='REP-A'");
    const vehicle=String((await execute('INSERT INTO vehicles(version_id,agency_id,vehicle_type,vin,status,purchase_price,entry_date) VALUES(?,?,?,?,?,?,?)',[version.id,agencies.A,'new','REP-TAXABLE','sold',8_000_000,'2026-08-01'])).insertId);
    const sale=String((await execute('INSERT INTO sales(sale_number,customer_id,agency_id,status,subtotal,tax_total,total,tax_mode,sold_at) VALUES(?,?,?,?,?,?,?,?,?)',['REP-TAXABLE',customer.id,agencies.A,'confirmed',10_000_000,2_000_000,12_000_000,'TAXABLE','2026-12-15 12:00:00'])).insertId);
    await pool.execute('INSERT INTO sale_items(sale_id,vehicle_id,description,tax_rate,line_total) VALUES(?,?,?,?,?)',[sale,vehicle,'Véhicule taxable',20,12_000_000]);
  }
  const taxable=await get('sales?from=2026-12-01&to=2026-12-31',agencyToken);
  assert.equal(taxable.status,200,JSON.stringify(taxable.body));
  assert.equal(taxable.body.revenue,12_000_000);assert.equal(taxable.body.revenue_ht,10_000_000);assert.equal(taxable.body.margin,2_000_000);
  const overview=await get('overview?from=2026-12-01&to=2026-12-31',agencyToken);
  assert.equal(overview.body.grossMarginRate,20);
});

test('Reporting MySQL 8.4 : granularités et dates invalides',{skip:!enabled},async()=>{
  const [actor]=await query<RowDataPacket[]>("SELECT id,agency_id FROM users WHERE email='rep-global@example.test'");
  const token=jwt.sign({sub:String(actor.id),email:'rep-global@example.test',roles:[],agencyId:String(actor.agency_id)},process.env.JWT_ACCESS_SECRET!);
  const api=supertest(createApp());
  const get=(path:string)=>api.get(`/api/reports/${path}`).set('Authorization',`Bearer ${token}`);
  for(const [granularity,expected] of [['day','2026-11-15'],['week','2026-11-09'],['month','2026-11']] as const){
    const response=await get(`sales?from=2026-11-15&to=2026-11-15&granularity=${granularity}`);
    assert.equal(response.status,200,JSON.stringify(response.body));assert.equal(response.body.series[0].period,expected);
  }
  assert.equal((await get('finance?from=2026-11-31&to=2026-12-01')).status,400);
  assert.equal((await get('finance?from=2026-12-01&to=2026-11-01')).status,400);
});
