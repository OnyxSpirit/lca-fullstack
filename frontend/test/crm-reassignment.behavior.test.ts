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

let ownerId='100',ownerName='Elion Rachidy',patchPayload:Record<string,unknown>|null=null,patchFails=false;
const lead=()=>({id:'10',opportunityId:'20',customerId:null,firstName:'Koffi',lastName:'Réaffectation',companyName:null,email:'koffi@test.local',phone:'+242060000001',source:'Web',stage:'qualified',title:'SUV',expectedValue:15000000,probability:60,priority:'medium',assignedUserId:ownerId,assignedUserName:ownerName,createdById:'200',createdByName:'Malik Hamed',agencyId:'1',notes:'',createdAt:'2026-09-08',updatedAt:'2026-09-08'});
const users=[{id:'100',displayName:'Elion Rachidy',roles:['SALES_AGENT'],agencyId:'1',isActive:true},{id:'101',displayName:'Carlos Silva',roles:['SALES_AGENT'],agencyId:'1',isActive:true},{id:'102',displayName:'Technicien',roles:['TECHNICIAN'],agencyId:'1',isActive:true},{id:'103',displayName:'Commercial externe',roles:['SALES_AGENT'],agencyId:'2',isActive:true},{id:'104',displayName:'Commercial inactif',roles:['SALES_AGENT'],agencyId:'1',isActive:false}];
globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{const url=String(input);if(url.includes('/users/directory'))return new Response(JSON.stringify(users),{status:200,headers:{'Content-Type':'application/json'}});if(url.endsWith('/leads/10')&&init?.method==='PATCH'){patchPayload=JSON.parse(String(init.body));if(patchFails)return new Response(JSON.stringify({message:'Réaffectation refusée'}),{status:403,headers:{'Content-Type':'application/json'}});ownerId=String(patchPayload?.assignedUserId);ownerName='Carlos Silva';return new Response(JSON.stringify(lead()),{status:200,headers:{'Content-Type':'application/json'}})}const body=url.includes('/activities')||url.includes('/quotations/opportunity/')?[]:[lead()];return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}})}) as typeof fetch;
after(()=>dom.window.close());
const user=(role:'SALES_MANAGER'|'SALES_REP')=>({id:role==='SALES_MANAGER'?'200':'100',name:role==='SALES_MANAGER'?'Malik Hamed':'Elion Rachidy',email:'test@lca.cg',role,roles:[role],primaryRole:role,roleTitle:'Commercial',avatar:'',agencyId:'1',agencyName:'Agence principale',department:'Ventes',phone:'',status:'active' as const});

async function renderCrm(role:'SALES_MANAGER'|'SALES_REP'){
  const testing=await import('@testing-library/react'),{useAuthStore}=await import('../src/stores/authStore.js'),{CrmPage}=await import('../src/modules/crm/CrmPage.js');
  useAuthStore.setState({currentUser:user(role),currentAgency:{id:'1',name:'Agence principale',code:'AG1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true});
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});testing.render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(CrmPage))));return{...testing,client};
}

test('UI-REASSIGN-02/03/04/05/06 Malik ouvre Modifier et réaffecte Elion vers Carlos',async()=>{
  patchFails=false;ownerId='100';ownerName='Elion Rachidy';patchPayload=null;const{fireEvent,screen,cleanup,waitFor,client}=await renderCrm('SALES_MANAGER');const{useUiStore}=await import('../src/stores/uiStore.js');
  fireEvent.click(await screen.findByText(/Koffi Réaffectation/));fireEvent.click(await screen.findByRole('button',{name:'Modifier'}));assert.ok(await screen.findByText('Modifier le prospect'));
  const select=screen.getByLabelText('Commercial affecté') as HTMLSelectElement;assert.deepEqual(Array.from(select.options).filter(option=>!option.disabled).map(option=>option.textContent),['Elion Rachidy','Carlos Silva']);
  fireEvent.change(select,{target:{value:'101'}});fireEvent.click(screen.getByRole('button',{name:'Mettre à jour'}));await waitFor(()=>assert.equal(patchPayload?.assignedUserId,'101'));await waitFor(()=>assert.equal(screen.queryByText('Modifier le prospect'),null));assert.ok(useUiStore.getState().toasts.some(toast=>toast.title==='Prospect mis à jour'));assert.equal(ownerName,'Carlos Silva');cleanup();client.clear();useUiStore.setState({toasts:[]});
});

test('UI-REASSIGN-01 le SALES_AGENT ne voit aucun sélecteur de réaffectation',async()=>{ownerId='100';ownerName='Elion Rachidy';const{fireEvent,screen,cleanup,client}=await renderCrm('SALES_REP');fireEvent.click(await screen.findByText(/Koffi Réaffectation/));fireEvent.click(await screen.findByRole('button',{name:'Modifier'}));assert.equal(screen.queryByLabelText('Commercial affecté'),null);cleanup();client.clear()});

test('UI-REASSIGN-07 une erreur backend reste explicite et ne modifie pas le propriétaire',async()=>{patchFails=true;ownerId='100';ownerName='Elion Rachidy';patchPayload=null;const{fireEvent,screen,cleanup,waitFor,client}=await renderCrm('SALES_MANAGER');const{useUiStore}=await import('../src/stores/uiStore.js');fireEvent.click(await screen.findByText(/Koffi Réaffectation/));fireEvent.click(await screen.findByRole('button',{name:'Modifier'}));fireEvent.change(await screen.findByLabelText('Commercial affecté'),{target:{value:'101'}});fireEvent.click(screen.getByRole('button',{name:'Mettre à jour'}));await waitFor(()=>assert.ok(useUiStore.getState().toasts.some(toast=>toast.title==='Mise à jour impossible'&&toast.description==='Réaffectation refusée')));assert.equal(ownerId,'100');assert.ok(screen.getByText('Modifier le prospect'));cleanup();client.clear();useUiStore.setState({toasts:[]});patchFails=false});
