import assert from'node:assert/strict';
import{randomUUID}from'node:crypto';
import{after,test}from'node:test';
import jwt from'jsonwebtoken';
import supertest from'supertest';
import type{RowDataPacket}from'mysql2/promise';
import{createApp}from'../src/app.js';
import{execute,pool,query}from'../src/config/database.js';

const enabled=process.env.LCA_REFUND_DB_TEST==='1';
if(enabled)after(async()=>pool.end());

test('AVOIR-REMBOURSEMENT-02 MySQL 8.4 : partiels, idempotence, concurrence et journal',{skip:!enabled},async()=>{
 const insert=async(sql:string,params:unknown[]=[])=>String((await execute(sql,params)).insertId),suffix=randomUUID().slice(0,8),api=supertest(createApp());
 const concession=await insert('INSERT INTO concessions(name,code) VALUES(?,?)',[`Refund ${suffix}`,`RF-${suffix}`]),agency=await insert('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[concession,'Agence refund',`RFA-${suffix}`]),user=await insert('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[agency,'Audit','Refund',`refund-${suffix}@test.local`,'test']);
 const[role]=await query<RowDataPacket[]>("SELECT id FROM roles WHERE code='SUPER_ADMIN' AND is_system=TRUE");await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[user,role.id]);
 const token=jwt.sign({sub:user,email:`refund-${suffix}@test.local`,roles:['SUPER_ADMIN'],agencyId:agency},process.env.JWT_ACCESS_SECRET!),auth=(request:supertest.Test)=>request.set('Authorization',`Bearer ${token}`),customer=await insert('INSERT INTO customers(customer_code,agency_id,first_name,last_name) VALUES(?,?,?,?)',[`RF-${suffix}`,agency,'Client','Refund']),method=(await query<RowDataPacket[]>('SELECT id FROM payment_methods LIMIT 1'))[0];
 const fixture=async(total=500_000)=>{const invoice=await insert("INSERT INTO invoices(invoice_number,customer_id,agency_id,invoice_type,status,issue_date,due_date,total,amount_paid,balance_due) VALUES(?,?,?,'workshop','paid','2026-09-01','2026-09-30',?,?,0)",[ `RF-I-${randomUUID().slice(0,8)}`,customer,agency,total,total]),payment=await insert("INSERT INTO payments(payment_number,invoice_id,customer_id,payment_method_id,amount,status) VALUES(?,?,?,?,?,'confirmed')",[`RF-P-${randomUUID().slice(0,8)}`,invoice,customer,method.id,total]),credit=await insert("INSERT INTO credit_notes(credit_note_number,invoice_id,customer_id,status,reason,amount,issue_date) VALUES(?,?,?,'applied','Correction',?,'2026-09-15')",[`RF-C-${randomUUID().slice(0,8)}`,invoice,customer,total]);return{invoice,payment,credit}};
 const refund=(payment:string,credit:string,amount:number,key=randomUUID())=>auth(api.post(`/api/payments/${payment}/refund`)).send({creditNoteId:credit,amount,reason:'Restitution client',idempotencyKey:key});

 const acceptance=await fixture(),partial=await refund(acceptance.payment,acceptance.credit,300_000);assert.equal(partial.status,201,JSON.stringify(partial.body));const[invoice]=await query<RowDataPacket[]>('SELECT amount_paid,balance_due,status FROM invoices WHERE id=?',[acceptance.invoice]),[payment]=await query<RowDataPacket[]>('SELECT amount,status FROM payments WHERE id=?',[acceptance.payment]),[refundSum]=await query<RowDataPacket[]>('SELECT SUM(amount) amount FROM payment_refunds WHERE payment_id=?',[acceptance.payment]);assert.equal(Number(invoice.amount_paid),200_000);assert.equal(Number(invoice.balance_due),0);assert.equal(payment.status,'confirmed');assert.equal(Number(refundSum.amount),300_000);

 const idem=await fixture(),key=randomUUID();assert.equal((await refund(idem.payment,idem.credit,100_000,key)).status,201);assert.equal((await refund(idem.payment,idem.credit,100_000,key)).status,200);const[idemCount]=await query<RowDataPacket[]>('SELECT COUNT(*) count FROM payment_refunds WHERE payment_id=?',[idem.payment]);assert.equal(Number(idemCount.count),1);
 const other=await fixture();assert.equal((await refund(idem.payment,other.credit,10_000)).status,409);assert.equal((await auth(api.post(`/api/payments/${idem.payment}/refund`)).send({amount:10_000,reason:'Sans avoir',idempotencyKey:randomUUID()})).status,400);

 const split=await fixture();for(const amount of[100_000,150_000,250_000])assert.equal((await refund(split.payment,split.credit,amount)).status,201);assert.equal((await refund(split.payment,split.credit,1)).status,409);
 const concurrent=await fixture(300_000),responses=await Promise.all([refund(concurrent.payment,concurrent.credit,200_000),refund(concurrent.payment,concurrent.credit,200_000)]);assert.equal(responses.filter(x=>x.status===201).length,1);const[concurrentSum]=await query<RowDataPacket[]>('SELECT SUM(amount) amount FROM payment_refunds WHERE payment_id=?',[concurrent.payment]);assert.equal(Number(concurrentSum.amount),200_000);

 const csv=await auth(api.get('/api/invoices/export/accounting?from=2026-09-01&to=2026-09-30').query({agencyId:agency}));assert.equal(csv.status,200,JSON.stringify(csv.body));assert.match(csv.text,/REM-/);assert.match(csv.text,/refunded/);
});
