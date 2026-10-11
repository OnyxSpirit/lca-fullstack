import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {withStagedVehicleImages} from '../src/modules/vehicles/vehicle-image-storage.js';

test('vehicle creation INSERT has one value for every column',()=>{
  const source=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');
  const match=source.match(/INSERT INTO vehicles\(([^)]+)\) VALUES\(([^`]+)\)/);
  assert.ok(match,'vehicle INSERT must remain discoverable');
  const columns=match[1]!.split(',').length;
  const placeholders=(match[2]!.match(/\?/g)??[]).length;
  const sqlConstants=(match[2]!.match(/'CONCESSION'|'MANUAL'|TRUE|CURDATE\(\)/g)??[]).length;
  assert.equal(placeholders+sqlConstants,columns);
  assert.equal(placeholders,30);
});

test('vehicle creation can execute atomically without an image',async()=>{
  let executed=false;
  const result=await withStagedVehicleImages([],async files=>{executed=true;assert.deepEqual(files,[]);return 'created'});
  assert.equal(executed,true);
  assert.equal(result,'created');
});
