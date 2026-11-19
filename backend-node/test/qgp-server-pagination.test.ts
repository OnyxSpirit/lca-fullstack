import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{pageMeta,standardPageRequest}from'../src/shared/pagination.js';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('QGP-PAG-01 convention 10/20/50/100 et correction de page',()=>{
 assert.deepEqual(standardPageRequest({}),{page:1,pageSize:10});
 for(const pageSize of[10,20,50,100])assert.equal(standardPageRequest({pageSize}).pageSize,pageSize);
 for(const pageSize of[1,7,11])assert.equal(standardPageRequest({pageSize}).pageSize,10);
 for(const pageSize of[101,500])assert.equal(standardPageRequest({pageSize}).pageSize,100);
 for(const total of[0,1,10,11,20,21,101]){const meta=pageMeta(total,standardPageRequest({page:999,pageSize:10}));assert.equal(meta.page,total===0?1:Math.ceil(total/10));assert.equal(meta.offset,(meta.page-1)*10)}
});

test('QGP-UI-001 achats directs: scope, compte, filtres et tri précèdent LIMIT/OFFSET',()=>{
 const route=source('src/modules/parts/direct-purchases.routes.ts');
 assert.match(route,/where=\['p\.agency_id=\?'\]/);
 for(const token of['search','status','purchaseKind','fundingSource','sortBy','sortOrder'])assert.match(route,new RegExp(token));
 assert.match(route,/SELECT COUNT\(\*\) total \$\{from\}/);
 assert.match(route,/ORDER BY \$\{sort\} \$\{direction\},p\.id \$\{direction\} LIMIT \? OFFSET \?/);
 assert.match(route,/res\.json\(paged\(/);
});

test('QGP-UI-002 fiscalité: agrégats globaux filtrés séparés de la page',()=>{
 const route=source('src/modules/fiscal/fiscal.routes.ts');
 for(const token of['status','from','to','taxTypeId','search','sortBy','sortOrder'])assert.match(route,new RegExp(token));
 assert.match(route,/COUNT\(\*\) total,COALESCE\(SUM\(o\.taxable_base\),0\)/);
 assert.match(route,/outstanding_amount \$\{from\}/);
 assert.match(route,/ORDER BY \$\{sort\} \$\{direction\},o\.id \$\{direction\} LIMIT \? OFFSET \?/);
 assert.match(route,/summary:\{taxableBase:/);
});

test('QGP-UI-003 ventes directes: périmètre agence avant comptage et pagination',()=>{
 const route=source('src/modules/parts/part-sales.routes.ts');
 assert.match(route,/await scope\(r,'parts\.sale\.view',a\)/);
 assert.match(route,/standardPageRequest/);assert.match(route,/SELECT COUNT\(\*\) total \$\{from\}/);
 assert.match(route,/ORDER BY ps\.id DESC LIMIT \? OFFSET \?/);assert.match(route,/res\.json\(paged\(/);
});

test('QGP-UI-004 transit SAV: soldes globaux et transferts paginés après scope',()=>{
 const route=source('src/modules/workshop/sav-operations.routes.ts');
 assert.match(route,/const scoped=scope\(req,'service\.transit\.view','st'\),requested=standardPageRequest/);
 assert.match(route,/SELECT COUNT\(\*\) total \$\{from\}/);assert.match(route,/transfers:paged\(/);
 assert.match(route,/balances:await transitBalances\(req\)/);
});
