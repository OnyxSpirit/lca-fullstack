import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const page=read('src/modules/crm/CrmPage.tsx');
const hooks=read('src/api/erpHooks.ts');
const bootstrap=read('src/components/AppBootstrap.tsx');

test('CRM-NEG-09 Pipeline reflète Gagné et Perdu',()=>{
  assert.match(page,/stage: 'GAGNE', label: 'Gagné \(Vente\)'/);
  assert.match(page,/stage: 'PERDU', label: 'Perdu'/);
  assert.match(page,/filteredLeads\.filter\(\(l\) => l\.stage === stage\)/);
});

test('CRM-NEG-10 la fiche et la vue Liste utilisent la même source autoritaire',()=>{
  assert.match(page,/const leadsQuery=viewMode==='kanban'\?pipelineQuery:listQuery/);
  assert.match(page,/setSelectedLead\(lead\)/);
  assert.match(page,/Transformer en Vente \/ Bon de Commande/);
  assert.match(page,/Marquer comme perdu/);
});

test('CRM-NEG-11 les query keys paginées restent invalidées par préfixe',()=>{
  assert.match(hooks,/invalidateQueries\(\{ queryKey: erpKeys\.leads \}\)/);
  assert.match(hooks,/leadQueryKey\(filters\.search,filters\.priority,filters\.stage,filters\.commercialId\),'page'/);
});

test('CRM-NEG-12 realtime recharge sans réinjecter un ancien état',()=>{
  assert.match(bootstrap,/crm:lead-updated/);
  assert.match(bootstrap,/invalidateQueries\(\{queryKey:erpKeys\.leads\}\)/);
  assert.match(bootstrap,/refreshPermissions\(\)\.catch\(\(\) => logout\(\)\)/);
  assert.doesNotMatch(bootstrap,/setQueryData[\s\S]{0,200}crm:lead-updated/);
});

test('CRM-NEG permissions et préconditions sont visibles dans le détail',()=>{
  assert.match(page,/canConvertQuotation=can\('quotations\.convert'\)&&can\('sales\.create'\)/);
  assert.match(page,/canUpdateStage&&canLoseLead/);
  assert.match(page,/Le devis doit être émis, non expiré et non déjà converti/);
});
