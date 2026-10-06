import assert from'node:assert/strict';
import test from'node:test';
import type{Request}from'express';
import type{RowDataPacket}from'mysql2/promise';
import{pool,query,transaction}from'../src/config/database.js';
import{bootstrapDatabase}from'../src/scripts/database-bootstrap.js';
import{accountStatus,categoryStatus,createAccount,createCategory,listAccounts,postMovement,reverse,transfer}from'../src/modules/treasury/treasury.service.js';

const enabled=process.env.TREASURY_CLOSURE_MYSQL_TEST==='1';
const request=(agencyId:string,userId:string,scope:'AGENCY'|'CONCESSION'|'GLOBAL')=>({user:{sub:userId,agencyId},rbac:{isSuperAdmin:false,permissions:new Map(['treasury.view','treasury.account.manage','treasury.category.manage','treasury.transfer.create','treasury.reverse'].map(permission=>[permission,scope]))},ip:'127.0.0.1',get:()=>undefined})as unknown as Request;

test('CLOSE-TREAS-01..11 invariants financiers réels MySQL 8.4',{skip:!enabled,timeout:300_000},async()=>{
  try{
    assert.equal((await bootstrapDatabase()).version,55);
    const concession=await query<RowDataPacket[]>('SELECT id FROM concessions ORDER BY id LIMIT 1');let concessionId=String(concession[0]?.id??'');
    if(!concessionId){const[c]=await pool.execute<any>('INSERT INTO concessions(name,code) VALUES(?,?)',['Clôture Trésorerie','CLOSE_TREAS']);concessionId=String(c.insertId)}
    const[a]=await pool.execute<any>('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[concessionId,'Agence clôture','CLOSE_TREAS_A']);const agencyId=String(a.insertId);
    const[u]=await pool.execute<any>('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[agencyId,'Audit','Trésorerie','close-treasury@example.test','not-used']);const userId=String(u.insertId);
    const agency=request(agencyId,userId,'AGENCY'),concessionRequest=request(agencyId,userId,'CONCESSION');
    let sequence=0;
    const account=async(type:'CASH'|'BANK'|'OTHER',opening=100000,central=false)=>String((await createAccount(concessionRequest,{concessionId,agencyId:central?null:agencyId,code:`CLOSE_${++sequence}`,name:`Compte ${sequence}`,accountType:type,currencyCode:'XAF',openingBalance:opening,openingDate:'2026-10-06',openingJustification:'Solde audit clôture'})).id);
    const balance=async(accountId:string)=>Number((await query<RowDataPacket[]>("SELECT COALESCE(SUM(CASE WHEN status='POSTED' AND direction='IN' THEN amount WHEN status='POSTED' THEN -amount ELSE 0 END),0) balance FROM treasury_movements WHERE account_id=?",[accountId]))[0]!.balance);

    for(const type of['CASH','BANK','OTHER']as const){const source=await account(type),destination=await account(type,1);await assert.rejects(transfer(concessionRequest,{sourceAccountId:source,destinationAccountId:destination,amount:150000,valueDate:'2026-10-06',description:'Solde insuffisant'}),error=>(error as any).status===409);assert.equal(await balance(source),100000)}

    const rollbackSource=await account('CASH'),rollbackDestination=await account('CASH',1),beforeTransfers=Number((await query<RowDataPacket[]>('SELECT COUNT(*) total FROM treasury_transfers'))[0]!.total);
    await assert.rejects(transfer(concessionRequest,{sourceAccountId:rollbackSource,destinationAccountId:rollbackDestination,amount:1000,valueDate:'2026-10-06',description:'Injection rollback'},point=>{assert.equal(point,'TRANSFER_AFTER_OUT');throw new Error('injection transfert')}),/injection transfert/);
    assert.equal(Number((await query<RowDataPacket[]>('SELECT COUNT(*) total FROM treasury_transfers'))[0]!.total),beforeTransfers);assert.equal(await balance(rollbackSource),100000);assert.equal(await balance(rollbackDestination),1);

    const concurrentSource=await account('CASH'),concurrentA=await account('CASH',1),concurrentB=await account('CASH',1),outcomes=await Promise.allSettled([
      transfer(concessionRequest,{sourceAccountId:concurrentSource,destinationAccountId:concurrentA,amount:80000,valueDate:'2026-10-06',description:'Concurrent A'}),
      transfer(concessionRequest,{sourceAccountId:concurrentSource,destinationAccountId:concurrentB,amount:80000,valueDate:'2026-10-06',description:'Concurrent B'}),
    ]);assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.filter(x=>x.status==='rejected').length,1);assert.equal(await balance(concurrentSource),20000);

    const reversalSource=await account('BANK'),reversalDestination=await account('BANK',1),posted=await transfer(concessionRequest,{sourceAccountId:reversalSource,destinationAccountId:reversalDestination,amount:10000,valueDate:'2026-10-06',description:'Transfert à contrepasser'}),movements=await query<RowDataPacket[]>('SELECT id,source_type,source_id,event_type,account_id,direction FROM treasury_movements WHERE transfer_id=? ORDER BY id',[posted.id]);
    assert.deepEqual(movements.map(row=>[row.source_type,String(row.source_id),row.event_type,row.direction]),[['TRANSFER',posted.id,'DEBIT','OUT'],['TRANSFER',posted.id,'CREDIT','IN']]);assert.equal(new Set(movements.map(row=>`${row.source_type}|${row.source_id}|${row.event_type}`)).size,2);
    await assert.rejects(reverse(concessionRequest,String(movements[0]!.id),{reason:'Injection rollback reversal',valueDate:'2026-10-06'},point=>{assert.equal(point,'TRANSFER_REVERSAL_AFTER_FIRST');throw new Error('injection reversal')}),/injection reversal/);assert.equal(Number((await query<RowDataPacket[]>('SELECT COUNT(*) total FROM treasury_transfers WHERE reversal_of_id=?',[posted.id]))[0]!.total),0);assert.equal(Number((await query<RowDataPacket[]>('SELECT COUNT(*) total FROM treasury_movements WHERE reversal_of_id IN (?,?)',[movements[0]!.id,movements[1]!.id]))[0]!.total),0);
    await accountStatus(concessionRequest,reversalSource,false);await accountStatus(concessionRequest,reversalDestination,false);const reversed=await reverse(concessionRequest,String(movements[0]!.id),{reason:'Correction sur comptes inactifs',valueDate:'2026-10-06'});assert.equal(await balance(reversalSource),100000);assert.equal(await balance(reversalDestination),1);const reversalMovement=(await query<RowDataPacket[]>('SELECT id FROM treasury_movements WHERE transfer_id=? ORDER BY id LIMIT 1',[reversed.id]))[0]!;await assert.rejects(reverse(concessionRequest,String(reversalMovement.id),{reason:'Reversal interdit',valueDate:'2026-10-06'}),error=>(error as any).status===409);await assert.rejects(reverse(concessionRequest,String(movements[0]!.id),{reason:'Double reversal interdit',valueDate:'2026-10-06'}),error=>(error as any).status===409);

    const categoryAccount=await account('OTHER'),category=await createCategory(concessionRequest,{concessionId,code:'CLOSE_CAT',name:'Catégorie clôture',allowedDirection:'IN'});await transaction(c=>postMovement(c,{accountId:categoryAccount,direction:'IN',amount:10,currencyCode:'XAF',categoryId:category.id,valueDate:'2026-10-06',description:'Historique catégorie',sourceType:'CLOSE_TEST',sourceId:'category-active',eventType:'IN',createdBy:userId}));await categoryStatus(concessionRequest,category.id,false);await assert.rejects(transaction(c=>postMovement(c,{accountId:categoryAccount,direction:'IN',amount:10,currencyCode:'XAF',categoryId:category.id,valueDate:'2026-10-06',description:'Catégorie inactive',sourceType:'CLOSE_TEST',sourceId:'category-inactive',eventType:'IN',createdBy:userId})),error=>(error as any).status===409);assert.equal(Number((await query<RowDataPacket[]>('SELECT COUNT(*) total FROM treasury_movements WHERE category_id=?',[category.id]))[0]!.total),1);

    const central=await account('BANK',1,true),agencySource=await account('BANK');assert.equal((await listAccounts(agency)).some(row=>String(row.id)===central),false);await assert.rejects(transfer(agency,{sourceAccountId:agencySource,destinationAccountId:central,amount:1,valueDate:'2026-10-06',description:'Agence vers central interdite'}),error=>(error as any).status===404);await transfer(concessionRequest,{sourceAccountId:agencySource,destinationAccountId:central,amount:1,valueDate:'2026-10-06',description:'Concession vers central autorisée'});assert.equal((await listAccounts(concessionRequest)).some(row=>String(row.id)===central),true);

    assert.equal((await bootstrapDatabase()).version,55);
  }finally{await pool.end()}
});
