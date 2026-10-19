import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import React from 'react';
import {JSDOM} from 'jsdom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter} from 'react-router-dom';

const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost/crm',pretendToBeVisual:true});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
localStorage.setItem('lca-access-token','test-token');
const lead={id:'10',opportunityId:'20',firstName:'Awa',lastName:'Doublon',email:'awa@test.local',phone:'+242060000001',source:'Web',stage:'qualified',title:'SUV',expectedValue:15000000,probability:60,priority:'medium',assignedUserId:'100',assignedUserName:'Agent Test',agencyId:'1',notes:'',createdAt:'2026-09-08',updatedAt:'2026-09-08'};
globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.includes('/appointments')&&init?.method==='POST')return new Response(JSON.stringify({statusCode:409,message:'Un rendez-vous actif existe déjà pour ce prospect sur ce créneau.',details:{code:'CRM_APPOINTMENT_DUPLICATE'}}),{status:409,headers:{'Content-Type':'application/json'}});const body=url.includes('/activities')||url.includes('/quotations/')||url.includes('/crm/team-members')?[]:{items:[lead],page:1,pageSize:50,total:1,totalPages:1,stageSummary:{qualified:{count:1,budget:15000000}}};return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}})}) as typeof fetch;
after(()=>dom.window.close());

test('B341 UI conserve le formulaire et le créneau lorsque le backend refuse le doublon',async()=>{
  const{render,fireEvent,screen,waitFor,cleanup}=await import('@testing-library/react');const{useAuthStore}=await import('../src/stores/authStore.js');const{useUiStore}=await import('../src/stores/uiStore.js');useUiStore.setState({toasts:[]});useAuthStore.setState({currentUser:{id:'100',name:'Agent Test',email:'agent@test.local',role:'SALES_REP',roles:['SALES_REP'],primaryRole:'SALES_REP',roleTitle:'Commercial',avatar:'',agencyId:'1',agencyName:'Agence Test',department:'Ventes',phone:'',status:'active',permissions:{'crm.prospect.view':'OWN','crm.activity.view':'OWN','crm.appointment.create':'OWN'}},currentAgency:{id:'1',name:'Agence Test',code:'AG1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true});
  const{CrmPage}=await import('../src/modules/crm/CrmPage.js');const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(CrmPage))));
  fireEvent.click(await screen.findByText(/Awa Doublon/));fireEvent.click(await screen.findByRole('button',{name:'Planifier un RDV'}));const input=screen.getByLabelText(/Date et heure/) as HTMLInputElement;fireEvent.change(input,{target:{value:'2099-10-22T10:00'}});fireEvent.click(screen.getByRole('button',{name:'Enregistrer le rendez-vous'}));
  await waitFor(()=>assert.equal(useUiStore.getState().toasts.at(-1)?.description,'Un rendez-vous actif existe déjà pour ce prospect sur ce créneau.'));assert.ok(screen.getByText('Planifier un rendez-vous commercial'));assert.equal(input.value,'2099-10-22T10:00');
  cleanup();client.clear();
});
