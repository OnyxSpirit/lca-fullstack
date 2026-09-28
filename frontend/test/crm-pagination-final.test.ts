import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{test}from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8'),page=read('../src/modules/crm/CrmPage.tsx'),hooks=read('../src/api/erpHooks.ts'),bootstrap=read('../src/components/AppBootstrap.tsx');

test('CRM-PAG-01..11 vue Liste utilise sept éléments et réinitialise tous les filtres',()=>{
 assert.match(page,/useLeadsPageQuery\(\{search:debouncedSearch,priority,stage:selectedStage,commercialId:selectedCommercial,page,pageSize:7\}/);
 assert.match(page,/useEffect\(\(\)=>setPage\(1\),\[debouncedSearch,selectedPriority,selectedStage,selectedCommercial\]\)/);
 assert.match(page,/Précédent/);assert.match(page,/Page \{page\} \/ \{Math\.max\(1,listQuery\.data\?\.totalPages\?\?1\)\}/);assert.match(page,/Suivant/);
});

test('CRM-PAG-12 Toute équipe, KPI total et actions restent préservés',()=>{
 assert.match(page,/<option value="">Toute l’équipe<\/option>/);assert.match(page,/leadTotal=viewMode==='list'\?\(listQuery\.data\?\.total\?\?0\):leads\.length/);
 assert.match(page,/onClick=\{\(\) => setSelectedLead\(lead\)\}/);assert.match(page,/handleStageChange\(lead\.id/);
});

test('CRM-PAG-17 query keys et invalidation realtime couvrent toutes les pages',()=>{
 assert.match(hooks,/\.\.\.leadQueryKey\(filters\.search,filters\.priority,filters\.stage,filters\.commercialId\),'page',filters\.page,filters\.pageSize/);
 assert.match(bootstrap,/invalidateQueries\(\{queryKey:erpKeys\.leads\}\)/);
 assert.match(page,/useLeadsQuery\(debouncedSearch,priority,viewMode==='kanban'/);
});
