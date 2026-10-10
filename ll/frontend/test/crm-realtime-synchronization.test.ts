import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {leadQueryKey} from '../src/api/crmQueryKeys.js';
import {createCrmRefreshScheduler} from '../src/services/crmRealtime.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('QK-01..06 et FILTER-01..06 chaque filtre Lead participe à une clé déterministe',()=>{
  assert.deepEqual(leadQueryKey('ada','high','won','42'),leadQueryKey('ada','high','won','42'));
  const keys=[
    leadQueryKey('ada','high','new','42'),
    leadQueryKey('ada','high','won','42'),
    leadQueryKey('ada','high','won','43'),
    leadQueryKey('bob','high','won','42'),
    leadQueryKey('ada','low','won','42'),
  ];
  assert.equal(new Set(keys.map(key=>JSON.stringify(key))).size,keys.length);
  assert.deepEqual(keys[1],['leads','ada','high','won','42']);
});

test('CRM-F01..14 mutations locales invalident les familles autoritaires concernées',()=>{
  const hooks=read('../src/api/erpHooks.ts');
  assert.match(hooks,/useCreateSale[\s\S]*?queryKey:erpKeys\.leads/);
  assert.match(hooks,/useCreateSale[\s\S]*?queryKey:erpKeys\.quotations/);
  assert.match(hooks,/useCreateSale[\s\S]*?queryKey:erpKeys\.customers/);
  assert.match(hooks,/useCreateQuotation[\s\S]*?queryKey:erpKeys\.leads/);
  assert.match(hooks,/useCreateQuotation[\s\S]*?queryKey:erpKeys\.customers/);
  for(const hook of ['useUpdateLead','useLeadStageMutation','useCreateCrmAppointment','useCreateCrmTestDrive'])assert.match(hooks,new RegExp(`${hook}[\\s\\S]*?queryKey: ?erpKeys\\.leads`));
  assert.match(hooks,/useCreateLead[\s\S]*?erpKeys\.leads/);
});

test('realtime CRM invalide de façon ciblée et nettoie son listener',()=>{
  const bootstrap=read('../src/components/AppBootstrap.tsx');
  assert.match(bootstrap,/socket\.on\('crm:lead-updated',crmLeadUpdated\)/);
  assert.match(bootstrap,/queryKey:erpKeys\.leads/);
  assert.match(bootstrap,/queryKey:dashboardOverviewKey/);
  assert.match(bootstrap,/customerChanged[\s\S]*?queryKey:erpKeys\.customers/);
  assert.match(bootstrap,/crmRefresh\.dispose\(\)/);
  assert.match(bootstrap,/socket\.off\('crm:lead-updated',crmLeadUpdated\)/);
  assert.doesNotMatch(bootstrap,/crm:lead-updated[\s\S]{0,500}invalidateQueries\(\)/);
});

test('Q-RAF-01 une rafale de 100 hints produit un seul refresh et conserve le marqueur Customer',async()=>{
  const refreshes:boolean[]=[];
  const scheduler=createCrmRefreshScheduler(value=>refreshes.push(value),5);
  for(let index=0;index<100;index+=1)scheduler.receive({customerChanged:index===73});
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.deepEqual(refreshes,[true]);
  scheduler.receive();
  scheduler.dispose();
  await new Promise(resolve=>setTimeout(resolve,20));
  assert.deepEqual(refreshes,[true]);
});
