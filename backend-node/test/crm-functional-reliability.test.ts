import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const crm=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');

test('CRM-03 pagine le Kanban et calcule les agrégats sur le prédicat complet',()=>{
  assert.match(crm,/GROUP BY o\.stage/);
  assert.match(crm,/COUNT\(\*\) count,COALESCE\(SUM\(o\.expected_value\),0\) budget/);
  assert.match(crm,/pageMeta\(total,pageRequest\(request\.query\)\)/);
  assert.match(crm,/stageSummary/);
  assert.match(crm,/if\(!paginationRequested\).*LIMIT 200/);
});

test('CRM-06 recherche l’identifiant dans le même prédicat scopé et paginé',()=>{
  assert.match(crm,/CAST\(l\.id AS CHAR\) LIKE \?/);
  const list=crm.slice(crm.indexOf("crmRouter.get('/leads'"),crm.indexOf("crmRouter.get('/leads/:id'"));
  assert.ok(list.indexOf('scoped.sql')<list.indexOf('CAST(l.id AS CHAR)'));
});

test('CRM-02 la détection informative est scopée et ne bloque pas la création',()=>{
  const duplicates=crm.slice(crm.indexOf("crmRouter.get('/leads/duplicates'"),crm.indexOf("crmRouter.get('/leads'"));
  assert.match(duplicates,/requirePermission\('crm\.prospect\.view'\)/);
  assert.match(duplicates,/crmLeadScope\(request,'crm\.prospect\.view'/);
  assert.match(duplicates,/LOWER\(TRIM\(l\.email\)\)/);
  assert.match(duplicates,/REGEXP_REPLACE\(l\.phone,'\[\^0-9\]',''\)/);
  const create=crm.slice(crm.indexOf("crmRouter.post('/leads'"),crm.indexOf("crmRouter.patch('/leads/:id'"));
  assert.doesNotMatch(create,/duplicates|duplicateConfirmation/);
});

test('CRM-01 les étapes structurantes restent produites par leurs opérations métier',()=>{
  const showroom=readFileSync(new URL('../src/modules/showroom/showroom-test-drive.ts',import.meta.url),'utf8');
  const quotation=readFileSync(new URL('../src/modules/quotations/quotation.service.ts',import.meta.url),'utf8');
  const sale=readFileSync(new URL('../src/modules/sales/sale.service.ts',import.meta.url),'utf8');
  assert.match(crm,/UPDATE opportunities SET stage='appointment'/);
  assert.match(showroom,/stage='test_drive'/);
  assert.match(quotation,/UPDATE opportunities SET stage='offer'/);
  assert.match(sale,/UPDATE opportunities SET stage='won'/);
});
