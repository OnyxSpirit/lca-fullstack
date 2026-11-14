import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('PRO-LIFE migration additive avec quatre états, historique et permission',()=>{const sql=read('../database/migrations/128_proforma_lifecycle.sql');for(const state of ['draft','issued','expired','cancelled'])assert.match(sql,new RegExp(`'${state}'`));assert.match(sql,/CREATE TABLE proforma_status_history/);assert.match(sql,/proformas\.cancel/);assert.doesNotMatch(sql,/DROP TABLE|DROP COLUMN|TRUNCATE/i)});
test('PRO-LIFE routes verrouillées, idempotentes et tri sur liste blanche',()=>{const route=read('../src/modules/proformas/proforma.routes.ts');assert.match(route,/FOR UPDATE/);assert.match(route,/INSERT IGNORE INTO proforma_status_history/);assert.match(route,/requireAgencyBusinessPermission\('proformas\.cancel'\)/);assert.match(route,/sortColumns:Record<string,string>/);assert.match(route,/sortColumns\[sortBy\]\?\?sortColumns\.date/)});
test('PRO-PDF neutralise JSON null et refuse une identité vide',()=>{const renderer=read('../src/modules/documents/commercial-document.ts');assert.match(renderer,/NULLIF\(JSON_UNQUOTE/);assert.match(renderer,/Identité client absente du snapshot/);assert.doesNotMatch(renderer,/COALESCE\(JSON_UNQUOTE\(JSON_EXTRACT\(p\.customer_snapshot,'\$\.company_name'\)\),CONCAT_WS/)});
