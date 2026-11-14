import assert from'node:assert/strict';
import{test}from'node:test';
import{mysqlDateTime}from'../src/modules/deliveries/delivery.routes.js';

for(const value of ['2026-11-14T08:00','2026-11-14T15:00','2026-11-14T23:30','2026-12-01 00:15:59'])test(`heure métier conservée ${value}`,()=>assert.equal(mysqlDateTime(value,'Date'),value.replace('T',' ')+(value.length===16?':00':'')));
test('refuse les instants UTC et les dates civiles impossibles',()=>{assert.throws(()=>mysqlDateTime('2026-11-14T15:00:00.000Z','Date'));assert.throws(()=>mysqlDateTime('2026-02-30T15:00','Date'))});
