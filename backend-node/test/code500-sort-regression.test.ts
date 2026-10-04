import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Request} from 'express';
import {agencies} from '../src/modules/settings/setting.service.js';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('SORT-SQL-01 quotations sort only narrow identifiers before loading wide rows',()=>{
  const service=source('src/modules/quotations/quotation.service.ts');
  assert.match(service,/SELECT \$\{distinct\}q\.id,q\.created_at/);
  assert.match(service,/quotationRows\(ids\.map/);
  assert.doesNotMatch(service,/\$\{SELECT\} WHERE \$\{where\.join[^\n]+ORDER BY q\.created_at/);
});

test('SORT-SQL-02 invoices sort only narrow identifiers before loading wide rows',()=>{
  const routes=source('src/modules/billing/billing.routes.ts');
  assert.match(routes,/SELECT i\.id,i\.issue_date/);
  assert.match(routes,/loadRows\(ids\.map/);
  assert.doesNotMatch(routes,/\$\{scopedBase\} WHERE \$\{where\} ORDER BY i\.issue_date/);
});

test('SORT-AGENCY-01 missing settings.view is rejected before any undefined SQL bind',async()=>{
  const request={rbac:{permissions:new Map()},user:{sub:'1'}} as unknown as Request;
  await assert.rejects(()=>agencies(request),(error:any)=>error?.status===403&&/scope OWN/.test(error.message));
});

test('SORT-AGENCY-02 agency listing validates collective read before building SQL params',()=>{
  const service=source('src/modules/settings/setting.service.ts');
  assert.match(service,/export async function agencies[\s\S]*?const scope = assertCollectiveRead\(r\)/);
  assert.doesNotMatch(service,/export async function agencies[\s\S]*?permissions\.get\("settings\.view"\),/);
});
