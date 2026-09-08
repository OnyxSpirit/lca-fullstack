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

const calls:string[]=[];
const prospect={id:'1',firstName:'Awa',lastName:'Diop',phone:'+242060000001',source:'Passage Showroom',stage:'new',title:'SUV',priority:'medium',assignedUserId:'2',assignedUserName:'Commercial Test',agencyId:'1'};
globalThis.fetch=(async(input:RequestInfo|URL)=>{const url=String(input);calls.push(url);const search=new URL(url,'http://localhost').searchParams.get('search')??'';return new Response(JSON.stringify(search==='AUCUN-PROSPECT-XYZ'?[]:[prospect]),{status:200,headers:{'Content-Type':'application/json'}})}) as typeof fetch;
after(()=>dom.window.close());

test('REC-05 la recherche CRM envoie le terme exact et remplace la liste par l’état vide',async()=>{
  const{render,fireEvent,screen,waitFor,cleanup}=await import('@testing-library/react');
  const{useAuthStore}=await import('../src/stores/authStore.js');
  useAuthStore.setState({currentUser:{id:'10',name:'Accueil Test',email:'accueil@test.local',role:'RECEPTIONIST',roles:['RECEPTIONIST'],primaryRole:'RECEPTIONIST',roleTitle:'Réception',avatar:'',agencyId:'1',agencyName:'Agence Test',department:'Accueil',phone:'',status:'active'},currentAgency:{id:'1',name:'Agence Test',code:'AG1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true});
  const{CrmPage}=await import('../src/modules/crm/CrmPage.js');
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(CrmPage))));
  const input=await screen.findByPlaceholderText('Rechercher par nom, téléphone, modèle...') as HTMLInputElement;
  fireEvent.click(screen.getByRole('button',{name:/Liste/}));
  fireEvent.change(input,{target:{value:'AUCUN-PROSPECT-XYZ'}});
  await waitFor(()=>assert.ok(calls.some(url=>new URL(url,'http://localhost').searchParams.get('search')==='AUCUN-PROSPECT-XYZ')),{timeout:1800});
  assert.equal(input.value,'AUCUN-PROSPECT-XYZ');
  await waitFor(()=>assert.ok(screen.queryByText('Aucun prospect ne correspond à vos critères')),{timeout:1800});
  assert.equal(screen.queryByText(/Awa Diop/),null);
  cleanup();client.clear();
});
