import test from'node:test';
import assert from'node:assert/strict';
import{pool}from'../src/config/database.ts';
import{processEvent}from'../src/modules/accounting/accounting-integration.service.ts';

test('annulation de règlement: neutralisation avant comptabilisation et contrepassation après',{skip:process.env.RUN_BILLING_MYSQL!=='1'},async()=>{
 const stamp=Date.now().toString(36).toUpperCase(),c=await pool.getConnection();let user='',agency='',journal='',period='',year='',debit='',credit='';
 try{
  const[co]:any=await c.execute('INSERT INTO concessions(name,code)VALUES(?,?)',[`Facturation ${stamp}`,`F${stamp}`]);
  const[ag]:any=await c.execute('INSERT INTO agencies(concession_id,name,code)VALUES(?,?,?)',[co.insertId,`Agence ${stamp}`,`A${stamp}`]);agency=String(ag.insertId);
  const[u]:any=await c.execute('INSERT INTO users(agency_id,first_name,last_name,email,password_hash)VALUES(?,?,?,?,?)',[agency,'Recette','Facturation',`billing-${stamp}@example.invalid`,'integration-only']);user=String(u.insertId);
  const[y]:any=await c.execute("INSERT INTO accounting_fiscal_years(code,name,start_date,end_date,status,created_by)VALUES(?,?,?,?,'OPEN',?)",[`Y${stamp}`,`Exercice ${stamp}`,'2026-01-01','2026-12-31',user]);year=String(y.insertId);
  const[p]:any=await c.execute("INSERT INTO accounting_periods(fiscal_year_id,period_number,name,start_date,end_date,status)VALUES(?,1,?,?,?,'OPEN')",[year,`Période ${stamp}`,'2026-01-01','2026-12-31']);period=String(p.insertId);
  const[j]:any=await c.execute("INSERT INTO accounting_journals(code,name,journal_type,is_active,created_by)VALUES(?,?,'BANK',TRUE,?)",[`B${stamp}`.slice(0,12),`Banque ${stamp}`,user]);journal=String(j.insertId);
  const[d]:any=await c.execute("INSERT INTO accounting_accounts(reference_version_id,number,label,account_class,account_type,is_postable,is_active,created_by)SELECT id,?,?,'5','BALANCE_SHEET',TRUE,TRUE,? FROM accounting_reference_versions LIMIT 1",[`51${stamp}`.slice(0,20),'Banque',user]);debit=String(d.insertId);
  const[k]:any=await c.execute("INSERT INTO accounting_accounts(reference_version_id,number,label,account_class,account_type,is_postable,is_active,created_by)SELECT id,?,?,'4','BALANCE_SHEET',TRUE,TRUE,? FROM accounting_reference_versions LIMIT 1",[`41${stamp}`.slice(0,20),'Client',user]);credit=String(k.insertId);
  await c.execute('INSERT INTO accounting_sequences(journal_id,fiscal_year_id,last_number)VALUES(?,?,1)',[journal,year]);
  const[entry]:any=await c.execute("INSERT INTO accounting_entries(journal_id,fiscal_year_id,period_id,agency_id,entry_number,draft_reference,label,accounting_date,currency_code,status,source_type,source_id,source_key,created_by,validated_by,posted_by,validated_at,posted_at)VALUES(?,?,?,?,?,?,?,'2026-11-12','XAF','POSTED','PAYMENT','9001','PAYMENT_CONFIRMED:9001',?,?,?,NOW(),NOW())",[journal,year,period,agency,`B${stamp.slice(0,4)}-Y${stamp}-000001`,`PAY-${stamp}`,'Encaissement',user,user,user]);
  await c.execute("INSERT INTO accounting_entry_lines(entry_id,line_order,account_id,agency_id,label,debit,credit,currency_code)VALUES(?,1,?,?,'Banque',1000,0,'XAF'),(?,2,?,?,'Client',0,1000,'XAF')",[entry.insertId,debit,agency,entry.insertId,credit,agency]);
  await c.execute("INSERT INTO accounting_integration_events(source_type,source_id,event_type,source_key,agency_id,event_date,currency_code,reference,label,payload,status,accounting_entry_id,created_by)VALUES('PAYMENT','9001','PAYMENT_CONFIRMED','PAYMENT_CONFIRMED:9001',?,'2026-11-12','XAF',?,'Encaissement',JSON_OBJECT('amount',1000),'POSTED',?,?)",[agency,`PAY-${stamp}`,entry.insertId,user]);
  const[cancel]:any=await c.execute("INSERT INTO accounting_integration_events(source_type,source_id,event_type,source_key,agency_id,event_date,currency_code,reference,label,payload,created_by)VALUES('PAYMENT_CANCELLATION','8001','PAYMENT_CANCELLED',?,?,'2026-11-13','XAF',?,'Annulation règlement',JSON_OBJECT('amount',1000,'originalPaymentId',9001),?)",[`PAYMENT_CANCELLED:${stamp}`,agency,`ANN-${stamp}`,user]);
  const[pending]:any=await c.execute("INSERT INTO accounting_integration_events(source_type,source_id,event_type,source_key,agency_id,event_date,currency_code,reference,label,payload,created_by)VALUES('PAYMENT','9002','PAYMENT_CONFIRMED','PAYMENT_CONFIRMED:9002',?,'2026-11-13','XAF',?,'Encaissement tardif',JSON_OBJECT('amount',500),?)",[agency,`PAY2-${stamp}`,user]);
  const[cancelPending]:any=await c.execute("INSERT INTO accounting_integration_events(source_type,source_id,event_type,source_key,agency_id,event_date,currency_code,reference,label,payload,created_by)VALUES('PAYMENT_CANCELLATION','8002','PAYMENT_CANCELLED',?,?,'2026-11-13','XAF',?,'Annulation avant worker',JSON_OBJECT('amount',500,'originalPaymentId',9002),?)",[`PAYMENT_CANCELLED:PENDING:${stamp}`,agency,`ANN2-${stamp}`,user]);
  c.release();
  const reversed=await processEvent(String(cancel.insertId),user);assert.equal(reversed.status,'POSTED');assert.ok(reversed.entryId);
  const[reversal]:any=await pool.execute('SELECT reversal_of_id,status FROM accounting_entries WHERE id=?',[reversed.entryId]);assert.equal(String(reversal[0].reversal_of_id),String(entry.insertId));assert.equal(reversal[0].status,'POSTED');
  const[original]:any=await pool.execute('SELECT status,reversed_by_id FROM accounting_entries WHERE id=?',[entry.insertId]);assert.equal(original[0].status,'REVERSED');assert.equal(String(original[0].reversed_by_id),String(reversed.entryId));
  const[lines]:any=await pool.execute('SELECT debit,credit FROM accounting_entry_lines WHERE entry_id=? ORDER BY line_order',[reversed.entryId]);assert.equal(Number(lines[0].credit),1000);assert.equal(Number(lines[1].debit),1000);
  const noop=await processEvent(String(cancelPending.insertId),user);assert.equal(noop.status,'POSTED');assert.equal(noop.entryId,null);
  const[pendingState]:any=await pool.execute('SELECT status FROM accounting_integration_events WHERE id=?',[pending.insertId]);assert.equal(pendingState[0].status,'IGNORED');
 }finally{if((c as any).connection)try{c.release()}catch{}await pool.end()}
});
