import test from'node:test';import assert from'node:assert/strict';import{readFile}from'node:fs/promises';
test('ERP11 traduit la concurrence email en conflit métier',async()=>{const source=await readFile(new URL('../src/modules/users/user.service.ts',import.meta.url),'utf8');assert.match(source,/error\?\.code==='ER_DUP_ENTRY'/);assert.match(source,/HttpError\(409,'EMAIL_ALREADY_EXISTS'\)/)});
