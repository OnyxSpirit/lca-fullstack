import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('SORT-SALES liste blanche, deux sens et ordre stable',()=>{const source=read('../src/modules/sales/sale.service.ts');for(const key of ['date','reference','client','amount','status'])assert.match(source,new RegExp(`${key}:`));assert.match(source,/sortColumns\[sortBy\]\?\?sortColumns\.date/);assert.match(source,/s\.id \$\{sortOrder\}/)});
test('SORT-QUOTATIONS liste blanche, validité et ordre stable',()=>{const source=read('../src/modules/quotations/quotation.service.ts');for(const key of ['date','reference','client','amount','validUntil'])assert.match(source,new RegExp(`${key}:`));assert.match(source,/sortColumns\[sortBy\]\?\?sortColumns\.date/);assert.match(source,/q\.id \$\{sortOrder\}/)});
test('SORT-SHOWROOM attente non négative, liste blanche et ordre stable',()=>{const source=read('../src/modules/showroom/showroom.routes.ts');for(const key of ['arrival','status','advisor','wait'])assert.match(source,new RegExp(`${key}:`));assert.match(source,/GREATEST\(0,TIMESTAMPDIFF/);assert.match(source,/sortColumns\[sortBy\]\?\?sortColumns\.status/);assert.match(source,/sv\.id \$\{sortOrder\}/)});
