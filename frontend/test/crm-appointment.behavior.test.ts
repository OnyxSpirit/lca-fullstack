import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import React from 'react';
import {JSDOM} from 'jsdom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';

const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost/crm'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
localStorage.setItem('lca-access-token','test-token');

const qualifiedLead={id:'10',opportunityId:'20',customerId:null,firstName:'Awa',lastName:'Qualifiée',companyName:null,email:'awa@test.local',phone:'+242060000001',source:'Web',stage:'qualified',title:'SUV',expectedValue:15000000,probability:60,priority:'medium',assignedUserId:'100',assignedUserName:'Agent Test',createdById:'100',createdByName:'Agent Test',agencyId:'1',notes:'',createdAt:'2026-09-08',updatedAt:'2026-09-08'};
globalThis.fetch=(async(input:RequestInfo|URL)=>{
  const url=String(input);
  const body=url.includes('/quotations/opportunity/')||url.includes('/activities')?[]:[qualifiedLead];
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
}) as typeof fetch;
after(()=>dom.window.close());

test('un prospect qualifié affiche l’action métier et ouvre le formulaire de rendez-vous',async()=>{
  const{render,fireEvent,screen,cleanup}=await import('@testing-library/react');
  const{useAuthStore}=await import('../src/stores/authStore.js');
  useAuthStore.setState({currentUser:{id:'100',name:'Agent Test',email:'agent@test.local',role:'SALES_REP',roles:['SALES_REP'],primaryRole:'SALES_REP',roleTitle:'Commercial',avatar:'',agencyId:'1',agencyName:'Agence Test',department:'Ventes',phone:'',status:'active'},currentAgency:{id:'1',name:'Agence Test',code:'AG1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true});
  const{CrmPage}=await import('../src/modules/crm/CrmPage.js');
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(CrmPage))));
  fireEvent.click(await screen.findByText(/Awa Qualifiée/));
  const action=await screen.findByRole('button',{name:'Planifier un RDV'});
  assert.ok(action);
  assert.equal(screen.queryByText(/doit d’abord être contacté/i),null);
  fireEvent.click(action);
  assert.ok(await screen.findByText('Planifier un rendez-vous commercial'));
  assert.ok(screen.getByLabelText(/Date et heure/));
  assert.equal(screen.queryByText(/doit d’abord être contacté/i),null);
  cleanup();client.clear();
});
