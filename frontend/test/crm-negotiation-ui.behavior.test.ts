import assert from 'node:assert/strict';
import {after,afterEach,test} from 'node:test';
import React from 'react';
import {JSDOM} from 'jsdom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/crm',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
localStorage.setItem('lca-access-token','crm-negotiation-ui-token');

const opportunity={id:'101',opportunityId:'201',customerId:'301',firstName:'Awa',lastName:'Négociation',companyName:null,email:'awa.negociation@test.local',phone:'+242060000001',source:'Web',stage:'negotiation',title:'SUV Test',expectedValue:25000000,probability:80,priority:'high',assignedUserId:'401',assignedUserName:'Rôle dynamique CRM',createdById:'401',createdByName:'Rôle dynamique CRM',agencyId:'1',notes:'',createdAt:'2026-10-01',updatedAt:'2026-10-01'};
const quotation={id:'501',quotationNumber:'DEV-CRM-NEG-UI',opportunityId:'201',customerId:'301',customerName:'Awa Négociation',agencyId:'1',salespersonId:'401',salespersonName:'Rôle dynamique CRM',createdById:'401',createdByName:'Rôle dynamique CRM',status:'negotiation',validUntil:'2099-12-31',subtotal:25000000,discountTotal:0,taxTotal:0,total:25000000,taxMode:'TAXABLE',priceInputMode:'HT',taxRate:18.9,currencyCode:'XAF',notes:'',createdAt:'2026-10-01',vehicleId:'601',vehicleLabel:'Marque Modèle Version',stockNumber:'STK-CRM-NEG-UI'};

globalThis.fetch=(async(input:RequestInfo|URL)=>{
  const url=String(input);
  const body=url.includes('/auth/me')?{user:{id:'401',firstName:'Rôle',lastName:'dynamique CRM',email:'crm.role@test.local',agencyId:'1',agencyName:'Agence test',agencyCode:'AG1',avatar:null,roles:['CRM_RECETTE'],role:{id:'701',code:'CRM_RECETTE',isSystemSuperAdmin:false},permissions:Object.entries(permissions('AGENCY')).map(([code,scope])=>({code,scope}))}}:url.includes('/quotations/opportunity/201')?[quotation]:url.includes('/activities')||url.includes('/crm/team-members')?[]:{items:[opportunity],page:1,pageSize:50,total:1,totalPages:1,stageSummary:{}};
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
}) as typeof fetch;

const scopes=['AGENCY','CONCESSION','GLOBAL'] as const;
type Scope=(typeof scopes)[number];
const permissions=(scope:Scope,without?:'quotations.convert'|'sales.create')=>Object.fromEntries([
  ['crm.prospect.view',scope],['crm.pipeline.advance',scope],['crm.prospect.lose',scope],['quotations.view',scope],['quotations.convert',scope],['sales.create',scope],
].filter(([code])=>code!==without));

async function renderCrm(scope:Scope,without?:'quotations.convert'|'sales.create'){
  const testing=await import('@testing-library/react');
  const{useAuthStore}=await import('../src/stores/authStore.js');
  const{CrmPage}=await import('../src/modules/crm/CrmPage.js');
  useAuthStore.setState({currentUser:{id:'401',name:'Rôle dynamique CRM',email:'crm.role@test.local',role:'CRM_RECETTE',roles:['CRM_RECETTE'],primaryRole:'CRM_RECETTE',roleCode:'CRM_RECETTE',roleTitle:'CRM recette',avatar:'',agencyId:'1',agencyName:'Agence test',department:'Ventes',phone:'',status:'active',permissions:permissions(scope,without)},currentAgency:{id:'1',name:'Agence test',code:'AG1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true});
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  testing.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(CrmPage))));
  return{...testing,client};
}

async function openNegotiation(scope:Scope,without?:'quotations.convert'|'sales.create'){
  const context=await renderCrm(scope,without);
  context.fireEvent.click(await context.screen.findByText(/Awa Négociation/));
  await context.screen.findByText('DEV-CRM-NEG-UI');
  return context;
}

for(const scope of scopes)test(`CRM-NEG-UI scope ${scope} compatible : bouton visible`,async()=>{
  const{screen,cleanup,client}=await openNegotiation(scope);
  assert.ok(screen.getByRole('button',{name:'Transformer en Vente / Bon de Commande'}));
  cleanup();client.clear();
});

test('CRM-NEG-UI-01/07 utilisateur autorisé et devis convertible : bouton visible',async()=>{
  const{screen,cleanup,client}=await openNegotiation('AGENCY');
  const button=screen.getByRole('button',{name:'Transformer en Vente / Bon de Commande'}) as HTMLButtonElement;
  assert.equal(button.disabled,false);
  cleanup();client.clear();
});

for(const missing of ['quotations.convert','sales.create'] as const)test(`CRM-NEG-UI permission absente ${missing} : bouton absent`,async()=>{
  const{screen,cleanup,client}=await openNegotiation('AGENCY',missing);
  assert.equal(screen.queryByRole('button',{name:'Transformer en Vente / Bon de Commande'}),null);
  cleanup();client.clear();
});

test('CRM-NEG-UI-08 clic ouvre le parcours de conversion avec les identifiants liés',async()=>{
  const{fireEvent,screen,cleanup,client}=await openNegotiation('AGENCY');
  fireEvent.click(screen.getByRole('button',{name:'Transformer en Vente / Bon de Commande'}));
  assert.ok(await screen.findByText('Créer une vente automobile'));
  cleanup();client.clear();
});

test('CRM-NEG-UI F5 réhydrate les permissions serveur avant de décider l’action',async()=>{
  const context=await renderCrm('AGENCY','quotations.convert');
  context.fireEvent.click(await context.screen.findByText(/Awa Négociation/));
  await context.screen.findByText('DEV-CRM-NEG-UI');
  assert.equal(context.screen.queryByRole('button',{name:'Transformer en Vente / Bon de Commande'}),null);
  const{useAuthStore}=await import('../src/stores/authStore.js');
  await context.act(()=>useAuthStore.getState().refreshPermissions());
  assert.ok(await context.screen.findByRole('button',{name:'Transformer en Vente / Bon de Commande'}));
  context.cleanup();context.client.clear();
});

afterEach(async()=>{const{useUiStore}=await import('../src/stores/uiStore.js');useUiStore.setState({toasts:[]})});
after(()=>dom.window.close());
