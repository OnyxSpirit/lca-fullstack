import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const page=read('../src/modules/hr/HrAdministrationPage.tsx'),record=read('../src/modules/hr/EmployeeRecordModal.tsx'),hooks=read('../src/api/hrHooks.ts'),users=read('../src/modules/users/UsersManagementPage.tsx');
test('UI-HR10-01..05 liste et création couvrent les employés sans compte',()=>{assert.match(page,/Nouvel employé/);assert.match(page,/Non lié/);assert.match(page,/actions\.createEmployee/);assert.match(page,/Aucun compte ERP ni mot de passe n’est créé/);assert.doesNotMatch(page,/employee-create[\s\S]{0,1800}name="password"/);assert.doesNotMatch(page,/employee-create[\s\S]{0,1800}name="roles"/)});
test('UI-HR10-06..12 fiche, liaison, déliaison et GED',()=>{assert.match(record,/Aucun compte ERP lié/);assert.match(record,/hr.employee.account.manage/);assert.match(record,/useEligibleUsersQuery/);assert.match(record,/linkEmployeeUser/);assert.match(record,/unlinkEmployeeUser/);assert.match(record,/useEntityDocuments\('employee'/);assert.match(record,/Imprimer/)});
test('UI-HR10-13..18 recherche RH, actions masquées et état vide',()=>{assert.match(hooks,/\/hr\/employees\?/);assert.match(page,/Aucun employé ne correspond aux critères/);assert.match(page,/can\('hr.employees.manage'\)/);assert.match(record,/can\('hr.employee.account.manage'\)/);assert.match(page,/x\.first_name.*x\.last_name/)});
test('UI-HR10-USERS aucune création implicite de dossier depuis un compte',()=>{assert.doesNotMatch(users,/Employé de l’entreprise|employeeNumber|employeePosition|employeeHireDate|employeeStatus|isEmployee/)});
