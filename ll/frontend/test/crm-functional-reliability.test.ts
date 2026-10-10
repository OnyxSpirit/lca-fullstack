import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const crm=readFileSync(new URL('../src/modules/crm/CrmPage.tsx',import.meta.url),'utf8');
const hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');
const modal=readFileSync(new URL('../src/modules/crm/NewLeadModal.tsx',import.meta.url),'utf8');
const customers=readFileSync(new URL('../src/modules/customers/CustomersListPage.tsx',import.meta.url),'utf8');
const detail=readFileSync(new URL('../src/modules/customers/CustomerDetailPage.tsx',import.meta.url),'utf8');

test('CRM-03 le Kanban utilise la pagination serveur et les agrégats globaux',()=>{
  assert.match(crm,/useLeadsPageQuery/);
  assert.match(crm,/pageSize:viewMode==='kanban'\?50:7/);
  assert.match(crm,/stageSummary/);
  assert.match(crm,/Page \{page\}/);
  assert.match(hooks,/stageSummary:LeadStageSummary/);
});

test('CRM-02 avertit sans fusion ni blocage définitif',()=>{
  assert.match(hooks,/useLeadDuplicateCheck/);
  assert.match(modal,/Prospect potentiellement déjà enregistré/);
  assert.match(modal,/Créer quand même/);
  assert.match(modal,/duplicateConfirmed/);
});

test('UX-01 les interactions auditées sont accessibles au clavier',()=>{
  for(const source of[crm,customers,detail]){
    assert.match(source,/tabIndex=\{0\}/);
    assert.match(source,/event\.key==='Enter'/);
    assert.match(source,/event\.key===' '/);
    assert.match(source,/focus-visible:ring-2/);
  }
});
