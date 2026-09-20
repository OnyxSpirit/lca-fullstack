import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Request} from 'express';
import {vehicleScope} from '../src/modules/vehicles/vehicle.routes.js';

const source=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');
const sales=readFileSync(new URL('../src/modules/sales/sale.service.ts',import.meta.url),'utf8');
const request=(scope:'AGENCY'|'CONCESSION'|'GLOBAL',agencyId='10')=>({user:{sub:'1',agencyId,roles:['DYNAMIC_STOCK']},query:{},rbac:{roleId:'1',roleCode:'DYNAMIC_STOCK',isSuperAdmin:false,permissions:new Map([['vehicles.view',scope]])}}) as unknown as Request;

test('STOCK-FILTER-01 conserve recherche, vue, statut, type, énergie, emplacement et stock dormant',()=>{
  for(const token of ['request.query.search','request.query.view','request.query.status','request.query.fuel','request.query.locationId','request.query.dormant'])assert.match(source,new RegExp(token.replaceAll('.','\\.')));
  assert.match(source,/\['status','v\.status',DB_STATUSES\],\['type','v\.vehicle_type',TYPES\]/);
});
test('STOCK-FILTER-02/03/04/05 marque et modèle sont des filtres SQL paramétrés et combinables',()=>{
  assert.match(source,/\[\['brandId','b\.id','marque'\],\['modelId','m\.id','modèle'\]\]/);
  assert.match(source,/clauses\.push\(`\$\{column\}=\?`\);params\.push\(value\)/);
  assert.match(source,/COUNT\(\*\) total[\s\S]*clauses\.join\(' AND '\)/);
  assert.doesNotMatch(source,/b\.id=\$\{value\}|m\.id=\$\{value\}/);
});
test('STOCK-FILTER-08/09/10 les filtres restent dans le scope AGENCY, CONCESSION ou GLOBAL',()=>{
  assert.deepEqual(vehicleScope(request('AGENCY'),'vehicles.view'),{sql:'v.agency_id=?',params:['10']});
  assert.match(vehicleScope(request('CONCESSION'),'vehicles.view').sql,/concession_id/);
  assert.deepEqual(vehicleScope(request('GLOBAL'),'vehicles.view'),{sql:'1=1',params:[]});
  assert.match(source,/filter-options[\s\S]*vehicleScope\(request,'vehicles\.view'\)/);
});
test('STOCK-KPI-01/02/04/06 seul available est compté par MySQL dans le scope courant',()=>{
  assert.match(source,/SUM\(v\.status='available'\) available/);
  assert.match(source,/availableForSale=Number\(row\?\.available/);
  assert.match(source,/FROM vehicles v WHERE v\.archived_at IS NULL AND \$\{scoped\.sql\}/);
  assert.match(source,/const availableForSale=Number\(row\?\.available\?\?0\)/);
});
test('STOCK-KPI-03 la vente réserve puis vend le véhicule au moment métier existant',()=>{
  assert.match(sales,/vehicle\.status!=='available'/);
  assert.match(sales,/UPDATE vehicles SET status='reserved'/);
  assert.match(sales,/status==='confirmed'[\s\S]*nextVehicleStatus='sold'/);
});
