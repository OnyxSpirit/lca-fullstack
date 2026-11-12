import test from 'node:test';
import assert from 'node:assert/strict';
import type { Request } from 'express';
import { pool } from '../src/config/database.ts';
import { save, validate, post, reverse } from '../src/modules/accounting/accounting-entry.service.ts';

const enabled=process.env.RUN_LOT3_MYSQL==='1';

test('LOT3 sérialise numérotation et contrepassation sur MySQL 8', {skip:!enabled}, async()=>{
  const stamp=Date.now().toString(36).toUpperCase();
  const c=await pool.getConnection();
  let userId='',agencyId='',journalId='',periodId='',debitId='',creditId='';
  try{
    await c.beginTransaction();
    const[concession]:any=await c.execute('INSERT INTO concessions(name,code) VALUES(?,?)',[`Concession ${stamp}`,`C${stamp}`]);
    const[agency]:any=await c.execute('INSERT INTO agencies(concession_id,name,code) VALUES(?,?,?)',[concession.insertId,`Agence ${stamp}`,`A${stamp}`]);agencyId=String(agency.insertId);
    const[user]:any=await c.execute('INSERT INTO users(agency_id,first_name,last_name,email,password_hash) VALUES(?,?,?,?,?)',[agencyId,'Test','Comptable',`lot3-${stamp}@example.invalid`,'integration-only']);userId=String(user.insertId);
    const[year]:any=await c.execute("INSERT INTO accounting_fiscal_years(code,name,start_date,end_date,status,created_by) VALUES(?,?,?,?,'OPEN',?)",[`FY${stamp}`,`Exercice ${stamp}`,'2026-01-01','2026-12-31',userId]);
    const[period]:any=await c.execute("INSERT INTO accounting_periods(fiscal_year_id,period_number,name,start_date,end_date,status) VALUES(?,1,?,?,?,'OPEN')",[year.insertId,`Période ${stamp}`,'2026-01-01','2026-12-31']);periodId=String(period.insertId);
    const[journal]:any=await c.execute("INSERT INTO accounting_journals(code,name,journal_type,is_active,created_by) VALUES(?,?,'MISCELLANEOUS',TRUE,?)",[`J${stamp}`.slice(0,12),`Journal ${stamp}`,userId]);journalId=String(journal.insertId);
    const[debit]:any=await c.execute("INSERT INTO accounting_accounts(reference_version_id,number,label,account_class,account_type,is_postable,is_active,created_by) SELECT id,?,?,'5','BALANCE_SHEET',TRUE,TRUE,? FROM accounting_reference_versions ORDER BY id LIMIT 1",[`51${stamp}`.slice(0,20),`Banque ${stamp}`,userId]);debitId=String(debit.insertId);
    const[credit]:any=await c.execute("INSERT INTO accounting_accounts(reference_version_id,number,label,account_class,account_type,is_postable,is_active,created_by) SELECT id,?,?,'4','BALANCE_SHEET',TRUE,TRUE,? FROM accounting_reference_versions ORDER BY id LIMIT 1",[`41${stamp}`.slice(0,20),`Client ${stamp}`,userId]);creditId=String(credit.insertId);
    await c.commit();
  }catch(error){await c.rollback();throw error}finally{c.release()}

  const permissions=new Map(['view','create','update','validate','post','reverse','export'].map(x=>[`accounting.entry.${x}`,'GLOBAL']));
  const request={user:{sub:userId},rbac:{permissions},agencyRbac:{activeAgencyId:agencyId},query:{},ip:'127.0.0.1',get:()=>undefined} as unknown as Request;
  const body=(reference:string)=>({journalId,periodId,agencyId,accountingDate:'2026-11-12',reference,label:`Écriture ${reference}`,currencyCode:'XAF',lines:[{accountId:debitId,label:'Débit',debit:'100.00',credit:'0'},{accountId:creditId,label:'Crédit',debit:'0',credit:'100.00'}]});

  const first=await save(request,null,body(`A-${stamp}`));
  await validate(request,first.id);
  const concurrent=await Promise.all([post(request,first.id),post(request,first.id)]);
  assert.equal(concurrent[0].entryNumber,concurrent[1].entryNumber);

  const second=await save(request,null,body(`B-${stamp}`));
  await validate(request,second.id);
  const postedSecond=await post(request,second.id);
  assert.notEqual(postedSecond.entryNumber,concurrent[0].entryNumber);

  const reversals=await Promise.allSettled([
    reverse(request,first.id,{reason:'Correction du test de concurrence',accountingDate:'2026-11-12'}),
    reverse(request,first.id,{reason:'Correction du test de concurrence',accountingDate:'2026-11-12'}),
  ]);
  assert.equal(reversals.filter(x=>x.status==='fulfilled').length,1);
  const[rows]:any=await pool.execute('SELECT COUNT(*) total FROM accounting_entries WHERE reversal_of_id=?',[first.id]);
  assert.equal(Number(rows[0].total),1);

  const blocked=await save(request,null,body(`C-${stamp}`));
  await validate(request,blocked.id);
  await pool.execute("UPDATE accounting_periods SET status='CLOSED' WHERE id=?",[periodId]);
  await assert.rejects(()=>post(request,blocked.id),/période comptable est clôturée/);
  await pool.execute("UPDATE accounting_periods SET status='OPEN' WHERE id=?",[periodId]);
  await pool.execute('UPDATE accounting_accounts SET is_active=FALSE WHERE id=?',[debitId]);
  await assert.rejects(()=>post(request,blocked.id),/comptes actifs et imputables/);
  await pool.end();
});
