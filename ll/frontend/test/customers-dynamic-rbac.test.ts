import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');
test('CLIENT-14 créer dépend de customers.create',async()=>assert.match(await read('../src/modules/customers/CustomersListPage.tsx'),/can\('customers\.create'\)/));
test('CLIENT-15 modifier et contacts dépendent de customers.update',async()=>{
  const source=await read('../src/modules/customers/CustomerDetailPage.tsx');assert.match(source,/can\('customers\.update'\)/);assert.match(source,/canUpdateCustomer&&<Button/);
});
test('CLIENT-16 la route Clients dépend de customers.view',async()=>assert.match(await read('../src/App.tsx'),/customers:'customers\.view'/));
test('CLIENT-17 à 20 les onglets agrégés utilisent les permissions dynamiques sources',async()=>{
  const source=await read('../src/modules/customers/CustomerDetailPage.tsx');
  for(const permission of ['sales.view','billing.invoice.view','service.order.view','crm.prospect.view'])assert.match(source,new RegExp(`can\\('${permission.replaceAll('.','\\.')}'\\)`));
  for(const token of ['hasPermission(roles','canAccessModule(roles','canPerformWorkflowAction(roles'])assert.equal(source.includes(token),false,token);
});
