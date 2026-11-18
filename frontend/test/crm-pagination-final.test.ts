import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8'),page=read('../src/modules/crm/CrmPage.tsx'),hooks=read('../src/api/erpHooks.ts'),bootstrap=read('../src/components/AppBootstrap.tsx');

test('CRM-PAG-01..11 vue Liste utilise dix éléments par défaut et réinitialise tous les filtres',()=>{
 assert.match(page,/\[pageSize,\s*setPageSize\]\s*=\s*useState\(10\)/);
 for(const field of ['search: debouncedSearch','priority','stage: selectedStage','commercialId: selectedCommercial','archive: archiveFilter','page','pageSize'])assert.match(page,new RegExp(field));
 assert.match(page,/setKanbanLimits\([\s\S]*Object\.fromEntries/);
 assert.match(page,/<ServerPagination/);assert.match(page,/onPageSizeChange=\{\(size\)\s*=>\s*\{/);assert.match(page,/setPageSize\(size\)/);assert.match(page,/setPage\(1\)/);
});

test('CRM-PAG-12 Toute équipe, KPI total et actions restent préservés',()=>{
 assert.match(page,/<option value="">Toute l’équipe<\/option>/);assert.match(page,/leadTotal\s*=\s*leadsQuery\.data\?\.total\s*\?\?\s*0/);
 assert.match(page,/onClick=\{\(\) => setSelectedLead\(lead\)\}/);assert.match(page,/handleStageChange\(/);
});

test('CRM-PAG-17 query keys et invalidation realtime couvrent toutes les pages',()=>{
 assert.match(hooks,/\.\.\.leadQueryKey\(filters\.search,filters\.priority,filters\.stage,filters\.commercialId\),'page',filters\.archive,filters\.page,filters\.pageSize/);
 assert.match(bootstrap,/invalidateQueries\(\{queryKey:erpKeys\.leads\}\)/);
 assert.match(page,/stageSummary/);assert.match(page,/useKanbanColumnsQuery/);
});
