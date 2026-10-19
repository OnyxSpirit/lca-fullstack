import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {syncEmployeeProfile} from '../src/modules/hr/hr-employee-sync.service.js';

const identity={agencyId:'11',firstName:'Aline',lastName:'Mabiala',email:'aline@example.test',phone:'+242000000'};

function connection(existing?:{id:number;employment_status:string}){
  const calls:{sql:string;params:unknown[]}[]=[];
  return{calls,db:{execute:async(sql:string,params:unknown[]=[])=>{
    calls.push({sql,params});
    if(sql.startsWith('SELECT id,employment_status FROM employee_profiles'))return[[...(existing?[existing]:[])],[]];
    if(sql.startsWith('SELECT concession_id FROM agencies'))return[[{concession_id:'C1'}],[]];
    if(sql.startsWith('INSERT INTO employee_profiles'))return[{insertId:77,affectedRows:1},[]];
    return[{affectedRows:1},[]];
  }} as any};
}

test('B3420 crée une seule fiche RH liée avec identité territoriale et fonction',async()=>{
  const fake=connection();
  const result=await syncEmployeeProfile(fake.db,'42',{isEmployee:true,employeeNumber:'EMP-42',employeePosition:'Responsable SAV',employeeHireDate:'2026-10-01',employeeStatus:'active'},'1','Conseillère',identity);
  assert.deepEqual(result,{id:'77',status:'active'});
  const insert=fake.calls.find(call=>call.sql.startsWith('INSERT INTO employee_profiles'))!;
  assert.match(insert.sql,/user_id,concession_id,agency_id,first_name,last_name,email,phone/);
  assert.deepEqual(insert.params.slice(0,10),['42','C1','11','Aline','Mabiala','aline@example.test','+242000000','EMP-42','Responsable SAV','2026-10-01']);
});

test('B3420 met à jour la fiche liée sans créer de doublon',async()=>{
  const fake=connection({id:9,employment_status:'active'});
  const result=await syncEmployeeProfile(fake.db,'42',{isEmployee:true,employeePosition:'Directrice atelier',employeeStatus:'active'},'1','Directrice',identity);
  assert.deepEqual(result,{id:'9',status:'active'});
  assert.equal(fake.calls.filter(call=>call.sql.startsWith('INSERT INTO employee_profiles')).length,0);
  assert.equal(fake.calls.filter(call=>call.sql.startsWith('UPDATE employee_profiles SET')).length,1);
});

test('B3420 le passage à Non conserve la fiche historique et la marque sortie',async()=>{
  const fake=connection({id:9,employment_status:'active'});
  assert.deepEqual(await syncEmployeeProfile(fake.db,'42',{isEmployee:false},'1',undefined,identity),{id:'9',status:'departed'});
  assert.match(fake.calls.at(-1)!.sql,/employment_status='departed'/);
  assert.doesNotMatch(fake.calls.map(call=>call.sql).join('\n'),/DELETE FROM employee_profiles/);
});

test('B3420 le dossier RH lit toujours la photographie du profil ERP',()=>{
  const source=readFileSync(new URL('../src/modules/hr/hr.routes.ts',import.meta.url),'utf8');
  assert.match(source,/LEFT JOIN users u ON u\.id=ep\.user_id/);
  assert.match(source,/u\.avatar_path/);
  assert.doesNotMatch(source,/employee_profiles SET avatar/);
});

test('B3420 le service utilisateurs impose permission RH et synchronisation atomique',()=>{
  const source=readFileSync(new URL('../src/modules/users/user.service.ts',import.meta.url),'utf8');
  assert.match(source,/assertEmployeeAgencyScope\(req,agencyId\)/);
  assert.match(source,/syncEmployeeProfile\(c,/);
  assert.match(source,/employee\.membership_updated/);
});
