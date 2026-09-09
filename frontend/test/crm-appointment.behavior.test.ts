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
let appointmentPayload:Record<string,unknown>|null=null,leadStage='qualified',leadReads=0;
globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input);
  if(url.includes('/appointments')&&init?.method==='POST'){appointmentPayload=JSON.parse(String(init.body));leadStage='appointment';return new Response(JSON.stringify({id:'501',leadId:'10',stage:'appointment',scheduledAt:appointmentPayload?.scheduledAt}),{status:201,headers:{'Content-Type':'application/json'}})}
  if(url.includes('/leads')&&!url.includes('/activities')&&!url.includes('/quotations'))leadReads++;
  const body=url.includes('/quotations/opportunity/')||url.includes('/activities')||url.includes('/users/directory')?[]:[{...qualifiedLead,stage:leadStage}];
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
}) as typeof fetch;
after(()=>dom.window.close());

test('RDV-01/02/05/06 utilise le vrai datetime-local, active le bouton puis exécute la mutation',async()=>{
  const{render,fireEvent,screen,cleanup,waitFor}=await import('@testing-library/react');
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
  const dateInput=screen.getByLabelText(/Date et heure/) as HTMLInputElement;
  const submit=screen.getByRole('button',{name:'Enregistrer le rendez-vous'}) as HTMLButtonElement;
  assert.equal(submit.disabled,true);
  assert.ok(screen.getByText(/Renseignez la date et l’heure/));
  fireEvent.change(dateInput,{target:{value:'2026-09-11T10:00'}});
  assert.equal(dateInput.value,'2026-09-11T10:00');
  assert.equal(submit.disabled,false);
  assert.equal(screen.queryByText(/Renseignez la date et l’heure/),null);
  fireEvent.click(submit);
  await waitFor(()=>assert.ok(appointmentPayload));
  assert.equal(appointmentPayload?.scheduledAt,new Date(2026,8,11,10,0).toISOString());
  await waitFor(()=>assert.equal(screen.queryByText('Planifier un rendez-vous commercial'),null));
  assert.ok(leadReads>=2);
  cleanup();client.clear();
});
