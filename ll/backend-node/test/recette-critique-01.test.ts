import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const crmAssignment=readFileSync(new URL('../src/modules/crm/crm-assignment.ts',import.meta.url),'utf8');
const crmRoutes=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
const vehicles=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');

test('CRM-TEAM-01/03 référentiel dynamique de candidats affectables',()=>{
  assert.match(crmRoutes,/get\('\/crm\/team-members'/);
  assert.match(crmAssignment,/listCrmTeamMembers/);
  assert.match(crmAssignment,/p\.code IN\('sales\.create','crm\.prospect\.update'\)/);
  assert.match(crmAssignment,/u\.is_active=TRUE/);
  assert.doesNotMatch(crmAssignment,/SALES_AGENT|SALES_MANAGER|DIRECTOR|@/);
});

test('CRM-TEAM-06 les candidats respectent OWN AGENCY CONCESSION GLOBAL',()=>{
  for(const scope of ['OWN','AGENCY','CONCESSION'])assert.match(crmAssignment,new RegExp(`scope==='${scope}'`));
  assert.match(crmAssignment,/assertPermission\(request,'crm\.prospect\.assign'\)/);
  assert.match(crmRoutes,/requirePermission\('crm\.prospect\.assign'\)/);
});

test('VIN-09 le backend refuse au lieu de tronquer un VIN forgé',()=>{
  assert.match(vehicles,/const vin=String\(request\.body\.vin\?\?''\)/);
  assert.doesNotMatch(vehicles,/const vin=txt\(request\.body\.vin,17\)/);
  assert.match(vehicles,/\^\[A-HJ-NPR-Z0-9\]\{17\}\$/);
});
