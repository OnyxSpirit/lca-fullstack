import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import React from 'react';
import {JSDOM} from 'jsdom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/deliveries'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
localStorage.setItem('lca-access-token','test-token');
let posted:Record<string,unknown>|null=null;
globalThis.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
  const url=String(input),method=init?.method??'GET';
  let body:unknown=[];
  if(url.endsWith('/deliveries/candidates'))body=[{sale_id:'10',sale_number:'VEN-10',customer_name:'Client Test',vehicle_label:'SUV',agency_id:'2'}];
  if(url.endsWith('/deliveries/candidates/10/specialists'))body=[{id:'201',name:'Coordinateur libre',agencyId:'2'}];
  if(url.endsWith('/deliveries')&&method==='POST'){posted=JSON.parse(String(init?.body));body={id:'301'};}
  return new Response(JSON.stringify(body),{status:method==='POST'?201:200,headers:{'Content-Type':'application/json'}});
}) as typeof fetch;
after(()=>dom.window.close());

test('DEL-CAND-UI vente agence 2 : le responsable apparaît et la planification envoie son identifiant',async()=>{
  const{render,screen,fireEvent,waitFor,cleanup}=await import('@testing-library/react');
  const{useAuthStore}=await import('../src/stores/authStore.js');
  const{NewDeliveryModal}=await import('../src/modules/deliveries/NewDeliveryModal.js');
  useAuthStore.setState({currentUser:{id:'100',name:'Planificateur',email:'planner@test.local',role:'PLANIFICATEUR',roles:['PLANIFICATEUR'],primaryRole:'PLANIFICATEUR',roleTitle:'Planificateur',avatar:'',agencyId:'1',agencyName:'Agence 1',department:'',phone:'',status:'active',permissions:{'delivery.schedule':'GLOBAL'}},currentAgency:{id:'1',name:'Agence 1',code:'A1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true});
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  let closed=false;
  render(React.createElement(QueryClientProvider,{client},React.createElement(NewDeliveryModal,{isOpen:true,onClose:()=>{closed=true},initialSaleId:'10'})));
  const specialist=await screen.findByRole('option',{name:'Coordinateur libre'});
  assert.equal((specialist as HTMLOptionElement).value,'201');
  assert.equal((screen.getByLabelText('Responsable livraison') as HTMLSelectElement).value,'201');
  fireEvent.change(screen.getByLabelText('Date et heure'),{target:{value:'2026-09-20T10:30'}});
  fireEvent.click(screen.getByRole('button',{name:'Planifier'}));
  await waitFor(()=>assert.equal(closed,true));
  assert.deepEqual({saleId:posted?.saleId,deliverySpecialistId:posted?.deliverySpecialistId},{saleId:'10',deliverySpecialistId:'201'});
  cleanup();client.clear();
});
