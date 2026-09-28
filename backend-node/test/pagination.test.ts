import assert from 'node:assert/strict';
import test from 'node:test';
import {pageMeta,pageRequest,paged} from '../src/shared/pagination.js';

test('pagination defaults to seven items and computes a stable offset',()=>{
  assert.deepEqual(pageRequest({}),{page:1,pageSize:7});
  assert.deepEqual(pageMeta(527,pageRequest({page:'3',pageSize:'7'})),{page:3,pageSize:7,totalPages:76,offset:14});
});

test('pagination clamps an out-of-range page after filters reduce the result set',()=>{
  assert.deepEqual(pageMeta(8,{page:99,pageSize:7}),{page:2,pageSize:7,totalPages:2,offset:7});
  assert.deepEqual(pageMeta(0,{page:4,pageSize:7}),{page:1,pageSize:7,totalPages:0,offset:0});
});

test('paged response keeps the filtered total independent from current items',()=>{
  assert.deepEqual(paged(['a','b'],527,pageMeta(527,{page:76,pageSize:7}),{summary:{amount:123}}),{
    items:['a','b'],total:527,page:76,pageSize:7,totalPages:76,summary:{amount:123},
  });
});

const modules=['sales','quotations','repair-orders','invoices','users','parts','purchase-orders','part-movements','workshop-history'];
for(const module of modules)test(`${module}: collection boundaries, navigation, scope and KPI stay coherent`,()=>{
  const records=Array.from({length:15},(_,index)=>({id:index+1,scope:index<12?'AGENCY_A':'AGENCY_B',amount:100}));
  const visible=records.filter(record=>record.scope==='AGENCY_A');
  const first=pageMeta(visible.length,{page:1,pageSize:7}),second=pageMeta(visible.length,{page:2,pageSize:7});
  assert.equal(visible.slice(first.offset,first.offset+first.pageSize).length,7);
  assert.equal(visible.slice(second.offset,second.offset+second.pageSize).length,5);
  assert.equal(second.totalPages,2);
  assert.equal(pageMeta(visible.length,{page:8,pageSize:7}).page,2);
  assert.equal(visible.reduce((sum,row)=>sum+row.amount,0),1200,'KPI covers all scoped rows, not the current page');
});

test('less than seven and exactly seven results remain single-page collections',()=>{
  assert.deepEqual(pageMeta(6,{page:1,pageSize:7}),{page:1,pageSize:7,totalPages:1,offset:0});
  assert.deepEqual(pageMeta(7,{page:1,pageSize:7}),{page:1,pageSize:7,totalPages:1,offset:0});
});
