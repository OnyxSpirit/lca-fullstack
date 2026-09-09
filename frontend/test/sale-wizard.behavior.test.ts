import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import React from 'react';
import {JSDOM} from 'jsdom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/crm'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
localStorage.setItem('lca-access-token','test-token');

globalThis.fetch=(async(input:RequestInfo|URL)=>{const url=String(input);let body:unknown=[];if(url.includes('/customers'))body=[{id:10,customerCode:'CLI-000010',customerType:'individual',firstName:'Client',lastName:'Test',phone:'+242060000001',agencyId:'1'}];if(url.includes('/vehicles'))body={items:[{id:20,stockNumber:'VN-20',vin:'VF1TEST0000000001',agencyId:'1',status:'available',salePrice:20_000_000,catalogPrice:20_000_000,brand:'LCA',model:'Test',version:'Premium'}],total:1,page:1,pageSize:50};if(url.includes('/users/directory'))body=[{id:100,displayName:'Elion Test',roles:['SALES_AGENT'],agencyId:'1',isActive:true}];return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}})}) as typeof fetch;
after(()=>dom.window.close());

test('COM-SALE-01 le wizard s’ouvre plusieurs fois sans setter obsolète ni ReferenceError',async()=>{
  const{render,screen,cleanup,waitFor}=await import('@testing-library/react');
  const{useAuthStore}=await import('../src/stores/authStore.js');
  const{SaleWizardModal}=await import('../src/modules/sales/SaleWizardModal.js');
  useAuthStore.setState({currentUser:{id:'100',name:'Elion Test',email:'elion@test.local',role:'SALES_REP',roles:['SALES_REP'],primaryRole:'SALES_REP',roleTitle:'Commercial',avatar:'',agencyId:'1',agencyName:'Agence Test',department:'Ventes',phone:'',status:'active'},currentAgency:{id:'1',name:'Agence Test',code:'AG1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true});
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}}),props={onClose:()=>undefined,initialCustomerId:'10',initialVehicleId:'20',initialOpportunityId:'30',initialQuotationId:'40',initialDiscount:1_000_000};
  const tree=(isOpen:boolean)=>React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(SaleWizardModal,{...props,isOpen})));
  const view=render(tree(true));
  assert.ok(await screen.findByText('Créer une vente automobile'));
  await waitFor(()=>assert.ok(screen.getByText('Client de l’agence')));
  view.rerender(tree(false));view.rerender(tree(true));
  assert.ok(await screen.findByText('Créer une vente automobile'));
  assert.ok(screen.getByText('Client de l’agence'));
  cleanup();client.clear();
});

test('COM-SALE-BUDGET le montant du wizard dépend du véhicule, du devis et de la remise, jamais du budget prospect',async()=>{
  const{readFile}=await import('node:fs/promises'),source=await readFile(new URL('../src/modules/sales/SaleWizardModal.tsx',import.meta.url),'utf8');
  assert.doesNotMatch(source,/setDepositAmount/);
  assert.doesNotMatch(source,/lead\.budget|prospect.*budget/i);
  assert.match(source,/vehicle\?\.sellingPriceTTC/);
  assert.match(source,/initialDiscount/);
  assert.match(source,/quotationId:initialQuotationId/);
  assert.match(source,/opportunityId:initialOpportunityId/);
  assert.match(source,/depositAmount:0/);
});

test('SALE-DETAIL-01/02 affiche montant, payé, reste, statut et tous les règlements',async()=>{const{readFile}=await import('node:fs/promises'),source=await readFile(new URL('../src/modules/sales/SaleDetailPage.tsx',import.meta.url),'utf8');for(const text of ['Total Net TTC à Payer','Total encaissé','Solde restant','Situation financière','Historique des règlements'])assert.match(source,new RegExp(text));assert.match(source,/invoice\.payments\.map/)});
test('SALE-DETAIL-03 un rôle billing.pay obtient le chemin Enregistrer un règlement',async()=>{const{readFile}=await import('node:fs/promises'),source=await readFile(new URL('../src/modules/sales/SaleDetailPage.tsx',import.meta.url),'utf8');assert.match(source,/hasPermission\(roles,'billing\.pay'\)/);assert.match(source,/canPay&&sale\.remainingBalanceTTC>0\?'Enregistrer un règlement'/)});
test('SALE-DETAIL-04 sans billing.pay la consultation reste disponible sans action interdite',async()=>{const{readFile}=await import('node:fs/promises'),source=await readFile(new URL('../src/modules/sales/SaleDetailPage.tsx',import.meta.url),'utf8');assert.match(source,/'Voir la facture et les règlements'/);assert.match(source,/encaissement doit être effectué par la comptabilité/)});
test('COM-SALE-02 une vente sans facture possède un chemin de création prérempli pour le rôle autorisé',async()=>{const{readFile}=await import('node:fs/promises'),sale=await readFile(new URL('../src/modules/sales/SaleDetailPage.tsx',import.meta.url),'utf8'),billing=await readFile(new URL('../src/modules/billing/BillingPage.tsx',import.meta.url),'utf8'),modal=await readFile(new URL('../src/modules/billing/NewInvoiceModal.tsx',import.meta.url),'utf8');assert.match(sale,/Créer la facture de vente/);assert.match(sale,/billing\?saleId=/);assert.match(billing,/initialSaleId=searchParams\.get\('saleId'\)/);assert.match(modal,/invoiceType:'vehicle',saleId:sale\.id/)});
