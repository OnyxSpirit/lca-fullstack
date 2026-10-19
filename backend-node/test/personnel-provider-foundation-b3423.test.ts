import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{splitSqlStatements}from'../src/scripts/mysql-migration-runner.js';

const source=(file:string)=>readFileSync(new URL(`../${file}`,import.meta.url),'utf8');

test('B3423-L1 migration 097 reste additive et ne fabrique aucun prestataire',()=>{
 const sql=source('database/migrations/097_personnel_provider_foundation.sql'),statements=splitSqlStatements(sql);
 assert.match(sql,/CREATE TABLE personnel_identities/);
 assert.match(sql,/CREATE TABLE provider_profiles/);
 assert.match(sql,/CREATE TABLE provider_agency_assignments/);
 assert.match(sql,/ADD COLUMN personnel_identity_id BIGINT UNSIGNED NULL/);
 assert.match(sql,/INSERT INTO personnel_identities/);
 assert.doesNotMatch(sql,/INSERT INTO provider_profiles\s*\(/);
 assert.equal(statements.some(statement=>/^(?:DROP|TRUNCATE|DELETE)\b/i.test(statement)),false);
 assert.equal(statements.length,9);
});

test('B3423-L1 backfill est déterministe, contrôlé et préserve les identifiants employés',()=>{
 const sql=source('database/migrations/097_personnel_provider_foundation.sql');
 assert.match(sql,/CONCAT\('EMP-',LPAD\(ep\.id,10,'0'\)\)/);
 assert.match(sql,/UPDATE employee_profiles ep[\s\S]*SET ep\.personnel_identity_id=pi\.id/);
 assert.match(sql,/employee_without_personnel_identity/);
 assert.match(sql,/employee_identity_mismatch/);
 assert.match(sql,/artificial_provider_profile/);
 assert.doesNotMatch(sql,/UPDATE employee_profiles[\s\S]*SET\s+ep\.id/i);
});

test('B3423-L1 les deux créations salariées et les mutations restent synchronisées transactionnellement',()=>{
 const routes=source('src/modules/hr/hr.routes.ts'),users=source('src/modules/hr/hr-employee-sync.service.ts'),service=source('src/modules/hr/personnel-identity.service.ts');
 assert.match(routes,/INSERT INTO employee_profiles[\s\S]*await syncEmployeePersonnelIdentity\(c, String\(result\.insertId\)\)/);
 assert.match(routes,/UPDATE employee_profiles SET user_id=\?,updated_by=\? WHERE id=\?[\s\S]*syncEmployeePersonnelIdentity\(c,employeeId\)/);
 assert.match(routes,/UPDATE employee_profiles SET user_id=NULL,updated_by=\? WHERE id=\?[\s\S]*syncEmployeePersonnelIdentity\(c,employeeId\)/);
 assert.match(users,/INSERT INTO employee_profiles[\s\S]*syncEmployeePersonnelIdentity\(connection,String\(result\.insertId\)\)/);
 assert.match(users,/UPDATE employee_profiles[\s\S]*syncEmployeePersonnelIdentity\(connection,String\(existing\.id\)\)/);
 assert.match(service,/FOR UPDATE/);
 assert.match(service,/identity_type='INDIVIDUAL'/);
});

test('B3423-L1 n’expose aucune route publique prestataire',()=>{
 const files=[source('src/modules/hr/hr.routes.ts'),source('src/modules/hr/hr-employee-sync.service.ts'),source('src/modules/hr/personnel-identity.service.ts')].join('\n');
 assert.doesNotMatch(files,/['"]\/hr\/providers/);
});
