import assert from'node:assert/strict';
import mysql from'mysql2/promise';

const config={host:process.env.DB_HOST??'mysql',port:Number(process.env.DB_PORT??3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME};
const admin=await mysql.createConnection(config);
const tag=Date.now().toString(36).toUpperCase();
const [[agency]]=await admin.query('SELECT id,concession_id FROM agencies ORDER BY id LIMIT 1');
const [[actor]]=await admin.query('SELECT id FROM users ORDER BY id LIMIT 1');
assert(agency&&actor,'La recette exige une agence et un utilisateur existants');
const [employeeResult]=await admin.execute("INSERT INTO employee_profiles(user_id,concession_id,agency_id,first_name,last_name,employee_number,hire_date,employment_status,created_by,updated_by) VALUES(NULL,?,?, 'Lot','Onze',?,CURDATE(),'active',?,?)",[agency.concession_id,agency.id,`L11-${tag}`,actor.id,actor.id]);
const employeeId=employeeResult.insertId;
const [typeResult]=await admin.execute('INSERT INTO employee_contract_types(concession_id,code,name,created_by,updated_by) VALUES(?,?,?,?,?)',[agency.concession_id,`T_${tag}`,`Type ${tag}`,actor.id,actor.id]);
const typeId=typeResult.insertId;
const draft=async ref=>(await admin.execute("INSERT INTO employee_contracts(employee_profile_id,concession_id,contract_type_id,type_code_snapshot,type_name_snapshot,reference,start_date,status,created_by,updated_by) VALUES(?,?,?,?,?,?,CURDATE(),'DRAFT',?,?)",[employeeId,agency.concession_id,typeId,`T_${tag}`,`Type ${tag}`,ref,actor.id,actor.id]))[0].insertId;
const a=await draft(`A-${tag}`),b=await draft(`B-${tag}`);

async function activate(contractId,delay){const c=await mysql.createConnection(config);try{await c.beginTransaction();const[[contract]]=await c.execute('SELECT * FROM employee_contracts WHERE id=? FOR UPDATE',[contractId]);await new Promise(resolve=>setTimeout(resolve,delay));await c.execute('SELECT id FROM employee_profiles WHERE id=? FOR UPDATE',[employeeId]);const[overlap]=await c.execute("SELECT id FROM employee_contracts WHERE employee_profile_id=? AND status='ACTIVE' AND id<>? AND start_date<=CURDATE() AND COALESCE(effective_end_date,contractual_end_date,'9999-12-31')>=CURDATE() FOR UPDATE",[employeeId,contractId]);if(overlap.length)throw new Error('OVERLAP');await c.execute("UPDATE employee_contracts SET status='ACTIVE',activated_at=NOW() WHERE id=? AND status='DRAFT'",[contract.id]);await c.commit();return'APPLIED'}catch(error){await c.rollback();return error.code??error.message}finally{await c.end()}}
const activation=await Promise.all([activate(a,80),activate(b,80)]);
const[[active]]=await admin.execute("SELECT COUNT(*) total FROM employee_contracts WHERE employee_profile_id=? AND status='ACTIVE'",[employeeId]);
assert.equal(Number(active.total),1,'un seul contrat concurrent devient applicable');
assert.equal(activation.filter(x=>x==='APPLIED').length,1);

const activeId=activation[0]==='APPLIED'?a:b;
async function renew(ref){const c=await mysql.createConnection(config);try{await c.beginTransaction();await c.execute('SELECT id FROM employee_profiles WHERE id=? FOR UPDATE',[employeeId]);await c.execute("INSERT INTO employee_contracts(employee_profile_id,concession_id,contract_type_id,type_code_snapshot,type_name_snapshot,reference,start_date,status,previous_contract_id,created_by,updated_by) VALUES(?,?,?,?,?,?,DATE_ADD(CURDATE(),INTERVAL 1 DAY),'DRAFT',?,?,?)",[employeeId,agency.concession_id,typeId,`T_${tag}`,`Type ${tag}`,ref,activeId,actor.id,actor.id]);await c.commit();return'APPLIED'}catch(error){await c.rollback();return error.code??error.message}finally{await c.end()}}
const renewals=await Promise.all([renew(`R1-${tag}`),renew(`R2-${tag}`)]);
assert.equal(renewals.filter(x=>x==='APPLIED').length,1,'un seul renouvellement par contrat précédent');

const cancelDraft=await draft(`C-${tag}`);
async function transition(mode){const c=await mysql.createConnection(config);try{await c.beginTransaction();const[[row]]=await c.execute('SELECT status FROM employee_contracts WHERE id=? FOR UPDATE',[cancelDraft]);if(row.status!=='DRAFT')throw new Error('STATE');if(mode==='activate')await c.execute("UPDATE employee_contracts SET status='ACTIVE',activated_at=NOW() WHERE id=?",[cancelDraft]);else await c.execute("UPDATE employee_contracts SET status='CANCELLED',cancelled_at=NOW(),cancellation_reason='test' WHERE id=?",[cancelDraft]);await c.commit();return'APPLIED'}catch(error){await c.rollback();return error.message}finally{await c.end()}}
const transitions=await Promise.all([transition('activate'),transition('cancel')]);
assert.equal(transitions.filter(x=>x==='APPLIED').length,1,'activate/cancel sérialisés');

const [[beforeLink]]=await admin.execute('SELECT COUNT(*) total FROM employee_contracts WHERE employee_profile_id=?',[employeeId]);
await admin.execute('UPDATE employee_profiles SET user_id=NULL WHERE id=?',[employeeId]);
const [[afterLink]]=await admin.execute('SELECT COUNT(*) total FROM employee_contracts WHERE employee_profile_id=?',[employeeId]);
assert.equal(Number(afterLink.total),Number(beforeLink.total),'link/unlink ne modifie pas les contrats');

const [typeRaceResult]=await admin.execute('INSERT INTO employee_contract_types(concession_id,code,name,created_by,updated_by) VALUES(?,?,?,?,?)',[agency.concession_id,`RACE_${tag}`,`Race ${tag}`,actor.id,actor.id]),typeRaceId=typeRaceResult.insertId;
const disable=mysql.createConnection(config).then(async c=>{try{await c.beginTransaction();await c.execute('SELECT id FROM employee_contract_types WHERE id=? FOR UPDATE',[typeRaceId]);await c.execute('UPDATE employee_contract_types SET is_active=FALSE WHERE id=?',[typeRaceId]);await new Promise(resolve=>setTimeout(resolve,100));await c.commit();return'DISABLED'}finally{await c.end()}});
const createAfterDisable=mysql.createConnection(config).then(async c=>{try{await new Promise(resolve=>setTimeout(resolve,20));await c.beginTransaction();const[rows]=await c.execute('SELECT id FROM employee_contract_types WHERE id=? AND is_active=TRUE FOR UPDATE',[typeRaceId]);if(!rows.length)throw new Error('TYPE_INACTIVE');await c.commit();return'CREATED'}catch(error){await c.rollback();return error.message}finally{await c.end()}});
const typeDisableRace=await Promise.all([disable,createAfterDisable]);
assert.deepEqual(typeDisableRace,['DISABLED','TYPE_INACTIVE']);

const [typeRace2Result]=await admin.execute('INSERT INTO employee_contract_types(concession_id,code,name,created_by,updated_by) VALUES(?,?,?,?,?)',[agency.concession_id,`RACE2_${tag}`,`Race2 ${tag}`,actor.id,actor.id]),typeRace2Id=typeRace2Result.insertId;
const createFirst=mysql.createConnection(config).then(async c=>{try{await c.beginTransaction();const[rows]=await c.execute('SELECT id FROM employee_contract_types WHERE id=? AND is_active=TRUE FOR UPDATE',[typeRace2Id]);assert.equal(rows.length,1);await new Promise(resolve=>setTimeout(resolve,100));await c.commit();return'VALIDATED'}finally{await c.end()}});
const disableAfter=mysql.createConnection(config).then(async c=>{try{await new Promise(resolve=>setTimeout(resolve,20));await c.beginTransaction();await c.execute('SELECT id FROM employee_contract_types WHERE id=? FOR UPDATE',[typeRace2Id]);await c.execute('UPDATE employee_contract_types SET is_active=FALSE WHERE id=?',[typeRace2Id]);await c.commit();return'DISABLED'}finally{await c.end()}});
const contractWinsRace=await Promise.all([createFirst,disableAfter]);
assert.deepEqual(contractWinsRace,['VALIDATED','DISABLED']);

const [employee2Result]=await admin.execute("INSERT INTO employee_profiles(user_id,concession_id,agency_id,first_name,last_name,employee_number,hire_date,employment_status,created_by,updated_by) VALUES(NULL,?,?, 'Lot','Onze-End',?,CURDATE(),'active',?,?)",[agency.concession_id,agency.id,`L11-END-${tag}`,actor.id,actor.id]),employee2=employee2Result.insertId;
const [active2Result]=await admin.execute("INSERT INTO employee_contracts(employee_profile_id,concession_id,contract_type_id,type_code_snapshot,type_name_snapshot,reference,start_date,status,activated_at,created_by,updated_by) VALUES(?,?,?,?,?,?,CURDATE(),'ACTIVE',NOW(),?,?)",[employee2,agency.concession_id,typeId,`T_${tag}`,`Type ${tag}`,`END-${tag}`,actor.id,actor.id]),active2=active2Result.insertId;
const endActive=mysql.createConnection(config).then(async c=>{try{await c.beginTransaction();const[[row]]=await c.execute('SELECT status FROM employee_contracts WHERE id=? FOR UPDATE',[active2]);if(row.status!=='ACTIVE')throw new Error('STATE');await c.execute('SELECT id FROM employee_profiles WHERE id=? FOR UPDATE',[employee2]);await c.execute("UPDATE employee_contracts SET status='ENDED',effective_end_date=CURDATE(),end_reason='test',ended_at=NOW() WHERE id=?",[active2]);await c.commit();return'ENDED'}finally{await c.end()}});
const renewAfterEnd=mysql.createConnection(config).then(async c=>{try{await new Promise(resolve=>setTimeout(resolve,20));await c.beginTransaction();const[[row]]=await c.execute('SELECT status FROM employee_contracts WHERE id=? FOR UPDATE',[active2]);if(!['ACTIVE','ENDED'].includes(row.status))throw new Error('STATE');await c.execute('SELECT id FROM employee_profiles WHERE id=? FOR UPDATE',[employee2]);await c.execute("INSERT INTO employee_contracts(employee_profile_id,concession_id,contract_type_id,type_code_snapshot,type_name_snapshot,reference,start_date,status,previous_contract_id,created_by,updated_by) VALUES(?,?,?,?,?,?,DATE_ADD(CURDATE(),INTERVAL 1 DAY),'DRAFT',?,?,?)",[employee2,agency.concession_id,typeId,`T_${tag}`,`Type ${tag}`,`END-R-${tag}`,active2,actor.id,actor.id]);await c.commit();return'RENEWED'}finally{await c.end()}});
const endVsRenew=await Promise.all([endActive,renewAfterEnd]);
assert.deepEqual(endVsRenew,['ENDED','RENEWED']);

console.log(JSON.stringify({doubleActivation:activation,active:Number(active.total),renewals,cancelVsActivate:transitions,typeDisableRace,contractWinsRace,endVsRenew,contractsPreserved:Number(afterLink.total)}));
await admin.end();
