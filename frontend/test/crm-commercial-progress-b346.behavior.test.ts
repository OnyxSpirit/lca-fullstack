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
localStorage.setItem('lca-access-token','b346-token');

const permissionEntries=[['crm.prospect.view','AGENCY']];
const rawLead=(stage:string,commercialProgress:number|null,commercialProgressState:string)=>({id:'346',opportunityId:'634',customerId:'1',firstName:'Awa',lastName:'Progression',companyName:null,email:'awa@test.local',phone:'+242060000346',source:'Web',stage,title:'SUV',expectedValue:20000000,probability:85,commercialProgress,commercialProgressState,priority:'high',assignedUserId:'10',assignedUserName:'Commercial CRM',createdById:'10',createdByName:'Commercial CRM',agencyId:'1',notes:'',createdAt:'2026-10-01',updatedAt:'2026-10-01'});
let lead=rawLead('appointment',40,'ACTIVE');

globalThis.fetch=(async(input:RequestInfo|URL)=>{
  const url=String(input),body=url.includes('/auth/me')?{user:{id:'10',firstName:'Commercial',lastName:'CRM',email:'commercial@test.local',agencyId:'1',agencyName:'Agence',agencyCode:'AG1',avatar:null,roles:['CRM'],role:{id:'1',code:'CRM',isSystemSuperAdmin:false},permissions:permissionEntries.map(([code,scope])=>({code,scope}))}}:url.includes('/activities')?[]:{items:[lead],page:1,pageSize:50,total:1,totalPages:1,stageSummary:{}};
  return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});
}) as typeof fetch;

async function renderCrm(){
  const testing=await import('@testing-library/react');
  const{useAuthStore}=await import('../src/stores/authStore.js');
  const{CrmPage}=await import('../src/modules/crm/CrmPage.js');
  useAuthStore.setState({currentUser:{id:'10',name:'Commercial CRM',email:'commercial@test.local',role:'CRM',roles:['CRM'],primaryRole:'CRM',roleCode:'CRM',roleTitle:'CRM',avatar:'',agencyId:'1',agencyName:'Agence',department:'Ventes',phone:'',status:'active',permissions:Object.fromEntries(permissionEntries)},currentAgency:{id:'1',name:'Agence',code:'AG1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true});
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  testing.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(CrmPage))));
  return{...testing,client};
}

test('B3461-FE-01 masque la qualification et conserve la progression rendez-vous 40 %',async()=>{
  lead=rawLead('appointment',40,'ACTIVE');const{screen,fireEvent,cleanup,client}=await renderCrm();
  assert.ok(await screen.findByText('Progression : 40 %'));assert.equal(screen.queryByText(/Qualification/),null);
  fireEvent.click(screen.getByRole('button',{name:/Ouvrir le prospect/}));
  assert.equal(screen.queryByText(/Score de qualification/),null);assert.ok(screen.getByText(/Progression commerciale :/));assert.equal(screen.getAllByText('40 %').length>=1,true);
  cleanup();client.clear();
});

test('B346-FE-02 une vente gagnée vaut 100 % et une perte n’est jamais présentée à 100 %',async()=>{
  lead=rawLead('won',100,'WON');let context=await renderCrm();assert.ok(await context.screen.findByText('Progression : 100 %'));context.cleanup();context.client.clear();
  lead=rawLead('lost',null,'LOST');context=await renderCrm();assert.ok(await context.screen.findByText('Progression : Vente perdue'));assert.equal(context.screen.queryByText('Progression : 100 %'),null);context.cleanup();context.client.clear();
});

test('B3461-FE-03 une progression absente est explicite et la liste ne réintroduit pas le score',async()=>{
  lead=rawLead('future_stage',null,'UNAVAILABLE');const{screen,fireEvent,cleanup,client}=await renderCrm();assert.ok(await screen.findByText('Progression : Indisponible'));
  fireEvent.click(screen.getByRole('button',{name:'Liste'}));assert.equal(screen.queryByText('Score de qualification'),null);assert.ok(screen.getByText('Progression commerciale'));cleanup();client.clear();
});

afterEach(async()=>{const{useUiStore}=await import('../src/stores/uiStore.js');useUiStore.setState({toasts:[]})});
after(()=>dom.window.close());
