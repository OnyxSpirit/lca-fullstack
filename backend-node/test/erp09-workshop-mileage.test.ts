import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const routes=readFileSync(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');

test('REC09-KM synchronise sans régression le kilométrage aux deux restitutions',()=>{
  assert.match(routes,/function synchronizeVehicleMileageAtHandover/);
  assert.match(routes,/current=Math\.max\(previous,input\.mileage\)/);
  assert.match(routes,/UPDATE vehicles SET mileage=\?/);
  assert.match(routes,/workshop\.vehicle_mileage\.updated/);
  assert.equal((routes.match(/await synchronizeVehicleMileageAtHandover\(/g)??[]).length,2);
});

test('REC09-KM verrouille le véhicule et préserve les rejouages',()=>{
  assert.match(routes,/WHERE v\.id=\? FOR UPDATE/);
  assert.match(routes,/if\(current===previous\)return/);
  assert.match(routes,/if\(existing\[0\]\)return/);
  assert.match(routes,/if\(ro\.status==='delivered'\|\|ro\.status==='closed'\)return/);
});
