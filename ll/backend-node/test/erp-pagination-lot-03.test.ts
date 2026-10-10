import assert from'node:assert/strict';
import{test}from'node:test';
import{readFileSync}from'node:fs';
import{pageMeta,pageRequest,paged}from'../src/shared/pagination.js';

test('C360-PAG et DELIVERY-PAG: bornes 0, 7, 8 et page hors limites',()=>{
 for(const total of[0,6,7]){const meta=pageMeta(total,pageRequest({page:1,pageSize:7}));assert.equal(meta.page,1);assert.equal(meta.pageSize,7);assert.equal(meta.totalPages,total?1:0)}
 const second=pageMeta(8,pageRequest({page:2,pageSize:7}));assert.deepEqual({page:second.page,offset:second.offset,totalPages:second.totalPages},{page:2,offset:7,totalPages:2});
 const clamped=pageMeta(8,pageRequest({page:99,pageSize:7}));assert.equal(clamped.page,2);assert.equal(clamped.offset,7);
 assert.deepEqual(paged(['dernier'],8,clamped),{items:['dernier'],total:8,page:2,pageSize:7,totalPages:2});
});

test('pageRequest borne les tailles artificiellement volumineuses',()=>{
 assert.equal(pageRequest({page:1,pageSize:7}).pageSize,7);
 assert.equal(pageRequest({page:1,pageSize:500}).pageSize,100);
});

test('Showroom applique les bornes inclusives sur arrival_at et conserve le défaut aujourd’hui',()=>{
 const source=readFileSync(new URL('../src/modules/showroom/showroom.routes.ts',import.meta.url),'utf8');
 assert.match(source,/sv\.arrival_at>=\?/);
 assert.match(source,/sv\.arrival_at<DATE_ADD\(\?,INTERVAL 1 DAY\)/);
 assert.match(source,/CURRENT_DATE/);
 assert.match(source,/request\.query\.all==='true'/);
});
