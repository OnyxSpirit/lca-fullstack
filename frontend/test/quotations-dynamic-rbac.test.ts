import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('QUOTE-FE-01/02 : lecture Devis et requêtes sont conditionnées par quotations.view',()=>{
  const crm=read('../src/modules/crm/CrmPage.tsx'),sales=read('../src/modules/sales/SalesListPage.tsx'),hooks=read('../src/api/erpHooks.ts');
  assert.match(crm,/can\('quotations\.view'\)/);assert.match(crm,/useLeadQuotationsQuery\(selectedLead\?\.opportunityId,canViewQuotations\)/);
  assert.match(sales,/useQuotationsQuery\(canViewQuotations\)/);assert.match(hooks,/requestEnabled&&Boolean\(opportunityId\)/);
});

test('QUOTE-FE-03/04/05/06 : créer, valider, annuler et convertir utilisent des permissions indépendantes',()=>{
  const crm=read('../src/modules/crm/CrmPage.tsx');
  for(const permission of ['quotations.create','quotations.validate','quotations.cancel','quotations.convert','sales.create'])assert.ok(crm.includes(`can('${permission}')`),permission);
  assert.match(crm,/canConvertQuotation=can\('quotations\.convert'\)&&can\('sales\.create'\)/);
  assert.doesNotMatch(crm,/crm\.offer\.prepare/);
});

test('QUOTE-FE-07 : remise pilotée par quotations.discount.manage',()=>{
  const modal=read('../src/modules/crm/QuotationModal.tsx');assert.match(modal,/can\('quotations\.discount\.manage'\)/);assert.match(modal,/disabled=\{!canManageDiscount\}/);
});

test('QUOTE-FE-08/09 : état expiré bloque préventivement la conversion et le backend reste autoritaire',()=>{
  const crm=read('../src/modules/crm/CrmPage.tsx'),hooks=read('../src/api/erpHooks.ts');assert.match(crm,/quotationCanConvert/);assert.match(crm,/disabled=\{!quotationCanConvert/);
  assert.match(hooks,/\/quotations\/\$\{id\}\/cancel/);assert.match(hooks,/\/quotations\/\$\{id\}\/validate/);
});

test('QUOTE-FE-10 : aucun nom de rôle historique ne décide des actions Devis',()=>{
  for(const file of ['../src/modules/crm/CrmPage.tsx','../src/modules/crm/QuotationModal.tsx','../src/modules/sales/SalesListPage.tsx'])assert.doesNotMatch(read(file),/SALES_AGENT|SALES_REP|SALES_MANAGER|DIRECTOR|roles\.includes|ROLE_PERMISSIONS/);
});
