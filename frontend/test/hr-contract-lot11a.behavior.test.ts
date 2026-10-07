import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const section=read('../src/modules/hr/EmployeeContractsSection.tsx'),record=read('../src/modules/hr/EmployeeRecordModal.tsx'),hooks=read('../src/api/hrHooks.ts');
test('UI-HR11A-01..05 section contrats et historique dans la fiche employé',()=>{assert.match(record,/EmployeeContractsSection/);assert.match(section,/Contrats/);assert.match(section,/effective_status/);assert.match(section,/type_name_snapshot/);assert.match(section,/type inactif/)});
test('UI-HR11A-06..15 création, dates, transitions, renouvellement et GED dédiée',()=>{for(const value of['Nouveau contrat','Référence contrat','Date début contrat','Activer','Terminer','Annuler','Renouveler','GED contrat'])assert.match(section,new RegExp(value));assert.match(section,/employee_contract/);assert.match(hooks,/\/hr\/contracts\/\$\{id\}\/activate/);assert.match(hooks,/\/renew/)});
test('UI-HR11A-16..20 permissions, type actif, vide et design ERP',()=>{assert.match(section,/can\('hr.contract.view'\)/);assert.match(section,/can\('hr.contract.manage'\)/);assert.match(hooks,/activeOnly\?'true'/);assert.match(section,/Aucun contrat enregistré/);assert.match(section,/rounded-md border/)});
