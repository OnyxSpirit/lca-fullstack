import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
const route=readFileSync(new URL('../src/modules/reports/extended-report.routes.ts',import.meta.url),'utf8');
test('LOT12B-REPORT-01 les domaines consolidés restent en lecture seule et séparés',()=>{for(const name of['commercial','treasury','budgets','hr','activity','returns'])assert.match(route,new RegExp(`get\\('/reports/consolidated/${name}'`));assert.doesNotMatch(route,/\.post\(|\.patch\(|\.delete\(/)});
test('LOT12B-REPORT-02 les transferts Treasury ne gonflent pas les flux économiques',()=>{assert.match(route,/tm\.transfer_id IS NULL AND tm\.direction='IN'/);assert.match(route,/tm\.transfer_id IS NULL AND tm\.direction='OUT'/);assert.match(route,/tm\.transfer_id IS NOT NULL AND tm\.direction='OUT'/)});
test('LOT12B-REPORT-03 RH utilise les sources canoniques et les statuts explicites',()=>{for(const source of['employee_profiles','salary_history','employee_contracts','employee_leaves','employee_bonuses'])assert.match(route,new RegExp(source));assert.match(route,/b\.status='APPROVED'/);assert.doesNotMatch(route,/leave_balance|payroll_run/)});
test('LOT12B-REPORT-04 l’intersection RBAC et le refus OWN collectif sont explicites',()=>{assert.match(route,/assertPermission\(r,'reporting\.view'\)/);assert.match(route,/collective&&scope==='OWN'/);assert.match(route,/activity\.view/);assert.match(route,/vehicle\.return\.view/)});
