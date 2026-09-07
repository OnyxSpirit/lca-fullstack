import assert from 'node:assert/strict';
import { after,test } from 'node:test';
import React from 'react';
import { JSDOM } from 'jsdom';
import { QueryClient,QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost/customers'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
localStorage.setItem('lca-access-token','test-token');

const thabo={id:'4',customerCode:'CLI-000004',customerType:'individual',civility:'M.',firstName:'Thabo',lastName:'Mbeki',email:'thabo@example.com',phone:'+242 06 000 00 04',city:'Brazzaville',classification:'occasional'};
const ndiaye={id:'3',customerCode:'CLI-000003',customerType:'company',civility:'Société',firstName:'Fatou',lastName:'Ndiaye',companyName:'Ndiaye Logistique Recette',email:'contact@ndiaye.example',phone:'+242 06 000 00 03',city:'Brazzaville',classification:'regular'};
const awa={id:'2',customerCode:'CLI-000002',customerType:'individual',civility:'Mme',firstName:'Awa',lastName:'Diop',email:'awa@example.com',phone:'06 800 20 03',city:'Brazzaville',classification:'occasional'};
const calls:string[]=[];
const calledWith=(value:string)=>calls.some(url=>new URL(url,'http://localhost').searchParams.get('search')===value);
globalThis.fetch=(async(input:RequestInfo|URL)=>{const url=String(input);calls.push(url);const search=new URL(url,'http://localhost').searchParams.get('search')??'';const payload=search==='Thabo'?[thabo]:search==='Ndiaye Logistique'?[ndiaye]:search==='CLI-000002'||search==='06 800 20 03'?[awa]:search==='AUCUN-CLIENT'?[]:[thabo,ndiaye,awa];return new Response(JSON.stringify(payload),{status:200,headers:{'Content-Type':'application/json'}})}) as typeof fetch;

after(()=>dom.window.close());

test('la recherche conserve la saisie, appelle l’API et remplace réellement les résultats',async()=>{
  const{render,fireEvent,screen,waitFor,cleanup}=await import('@testing-library/react');
  const{CustomersListPage}=await import('../src/modules/customers/CustomersListPage.js');
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,null,React.createElement(CustomersListPage))));
  const input=screen.getByPlaceholderText(/Rechercher par nom/) as HTMLInputElement;

  fireEvent.change(input,{target:{value:'Thabo'}});
  await waitFor(()=>assert.ok(calledWith('Thabo')),{timeout:1500});
  assert.equal(input.value,'Thabo');
  assert.ok(screen.getByText(/Thabo Mbeki/));
  assert.equal(screen.queryByText(/Ndiaye Logistique Recette/),null);

  fireEvent.change(input,{target:{value:'Ndiaye Logistique'}});
  await waitFor(()=>assert.ok(calledWith('Ndiaye Logistique')),{timeout:1500});
  assert.equal(input.value,'Ndiaye Logistique');
  assert.ok(screen.getByText('Ndiaye Logistique Recette'));
  assert.equal(screen.queryByText(/Thabo Mbeki/),null);

  for(const value of ['CLI-000002','06 800 20 03']){fireEvent.change(input,{target:{value}});await waitFor(()=>assert.ok(calledWith(value)),{timeout:1500});assert.equal(input.value,value);assert.ok(screen.getByText(/Awa Diop/));assert.equal(screen.queryByText(/Thabo Mbeki/),null)}

  fireEvent.change(input,{target:{value:'AUCUN-CLIENT'}});
  await waitFor(()=>assert.ok(calledWith('AUCUN-CLIENT')),{timeout:1500});
  assert.equal(input.value,'AUCUN-CLIENT');
  assert.ok(screen.getByText('Aucun client ne correspond à vos critères'));
  cleanup();client.clear();
});
