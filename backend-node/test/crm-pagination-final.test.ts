import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';
import{pageMeta,pageRequest,paged}from'../src/shared/pagination.js';

test('CRM-PAG-01..08 calcule correctement les pages de sept éléments',()=>{
 for(const total of[0,6,7]){const meta=pageMeta(total,pageRequest({page:1,pageSize:7}));assert.equal(meta.pageSize,7);assert.equal(meta.totalPages,total?1:0)}
 const first=pageMeta(12,pageRequest({page:1,pageSize:7})),second=pageMeta(12,pageRequest({page:2,pageSize:7})),outside=pageMeta(12,pageRequest({page:99,pageSize:7}));
 assert.deepEqual([first.offset,second.offset,second.totalPages,outside.page],[0,7,2,2]);
 assert.deepEqual(paged(Array(5).fill('prospect'),12,second),{items:Array(5).fill('prospect'),total:12,page:2,pageSize:7,totalPages:2});
});

test('CRM-PAG-13..15 applique scope et filtres avant agrégats puis un tri stable',()=>{
 const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8'),route=source.slice(source.indexOf("crmRouter.get('/leads'"),source.indexOf("crmRouter.get('/leads/:id'"));
 assert.ok(route.indexOf('crmLeadScope')<route.indexOf('SELECT o.stage,COUNT(*) count'));
 assert.ok(route.indexOf('const where=')<route.indexOf('SELECT o.stage,COUNT(*) count'));
 assert.match(route,/ORDER BY l\.updated_at DESC,l\.id DESC LIMIT \? OFFSET \?/);
 assert.match(route,/response\.json\(paged\(rows\.map\(mapLead\),total,meta,\{stageSummary\}\)\)/);
});

test('le contrat historique du pipeline reste un tableau limité comme avant',()=>{
 const source=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
 assert.match(source,/if\(!paginationRequested\).*LIMIT 200.*response\.json\(rows\.map\(mapLead\)\)/s);
});
