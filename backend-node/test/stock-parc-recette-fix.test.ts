import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {vehicleInventoryViewSql} from '../src/modules/vehicles/vehicle.routes.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const routes=read('../src/modules/vehicles/vehicle.routes.ts');
const baseline=read('../database/baseline/001_initial_schema.sql');

test('R01 compteurs et liste partagent la même vue et la définition canonique non affecté',()=>{
  assert.match(vehicleInventoryViewSql('active'),/NOT IN\('sold','delivered'\)/);
  assert.match(vehicleInventoryViewSql('sold'),/IN\('sold','delivered'\)/);
  assert.equal(vehicleInventoryViewSql('all'),'');
  assert.throws(()=>vehicleInventoryViewSql('invalid'));
  assert.match(routes,/SUM\(v\.vehicle_location_id IS NULL\) unassigned/);
  assert.match(routes,/assignment==='unassigned'\)clauses\.push\('v\.vehicle_location_id IS NULL'\)/);
  assert.match(routes,/location-counts[\s\S]+vehicleInventoryViewSql\(view\)/);
});

test('R01 compteurs restent agrégés avant pagination et dans le scope RBAC',()=>{
  const counts=routes.slice(routes.indexOf("vehicleRouter.get('/vehicles/location-counts'"),routes.indexOf("vehicleRouter.get('/vehicles/agencies/create'"));
  assert.match(counts,/vehicleScope\(request,'vehicles\.view'\)/);
  assert.doesNotMatch(counts,/LIMIT|OFFSET/);
  assert.match(counts,/COUNT\(\*\) total/);
});

test('R02 le contrat actif est VN/VO sans détruire les valeurs historiques',()=>{
  assert.match(routes,/const ACTIVE_TYPES=\['new','used'\]/);
  assert.match(routes,/Le type doit être VN ou VO/);
  assert.match(baseline,/vehicle_type ENUM\('new','used','demo','courtesy'\)/);
  assert.doesNotMatch(routes,/const ACTIVE_TYPES=[^\n]+demo|const ACTIVE_TYPES=[^\n]+courtesy/);
});
