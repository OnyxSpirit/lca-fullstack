import assert from 'node:assert/strict';
import {after,test} from 'node:test';
import React from 'react';
import {JSDOM} from 'jsdom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {MemoryRouter,Route,Routes} from 'react-router-dom';

const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{url:'http://localhost/customers'});
Object.assign(globalThis,{window:dom.window,document:dom.window.document,HTMLElement:dom.window.HTMLElement,Event:dom.window.Event,IS_REACT_ACT_ENVIRONMENT:true});
Object.defineProperty(globalThis,'navigator',{value:dom.window.navigator,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
localStorage.setItem('lca-access-token','test-token');

const customers=Array.from({length:35},(_,index)=>({id:String(index+1),customerCode:`CLI-${String(index+1).padStart(6,'0')}`,customerType:index%2?'company':'individual',civility:index%2?'Société':'M.',firstName:`Client ${index+1}`,lastName:'Pagination',companyName:index%2?`Société ${index+1}`:undefined,email:`client${index+1}@example.test`,phone:'+242060000000',city:'Brazzaville',classification:'occasional'}));
const calls:string[]=[];
globalThis.fetch=(async(input:RequestInfo|URL)=>{const url=String(input),parsed=new URL(url,'http://localhost'),requestedPage=Number(parsed.searchParams.get('page')??1),pageSize=Number(parsed.searchParams.get('pageSize')??15),search=parsed.searchParams.get('search')??'',type=parsed.searchParams.get('type')??'';calls.push(url);const filtered=customers.filter(customer=>(!search||customer.firstName.includes(search))&&(!type||customer.customerType===type)),totalPages=Math.ceil(filtered.length/pageSize),page=totalPages?Math.min(requestedPage,totalPages):1,start=(page-1)*pageSize;return new Response(JSON.stringify({items:filtered.slice(start,start+pageSize),total:filtered.length,page,pageSize,totalPages}),{status:200,headers:{'Content-Type':'application/json'}})}) as typeof fetch;

after(()=>dom.window.close());

test('la liste clients expose les contrôles, pages et tailles serveur puis réinitialise la recherche',async()=>{
  const{render,fireEvent,screen,waitFor,cleanup}=await import('@testing-library/react');
  const{CustomersListPage}=await import('../src/modules/customers/CustomersListPage.js');
  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  render(React.createElement(QueryClientProvider,{client},React.createElement(MemoryRouter,{initialEntries:['/customers']},React.createElement(Routes,null,React.createElement(Route,{path:'/customers',element:React.createElement(CustomersListPage)}),React.createElement(Route,{path:'/customers/:id',element:React.createElement('p',null,'Fiche client ouverte')})))));
  await screen.findByText('Affichage de 1 à 15 sur 35 clients');
  assert.ok(screen.getByText('Page 1 sur 3'));
  const previous=screen.getByRole('button',{name:'Précédent'}) as HTMLButtonElement,next=screen.getByRole('button',{name:'Suivant'}) as HTMLButtonElement;
  assert.equal(previous.disabled,true);assert.equal(next.disabled,false);
  fireEvent.click(next);
  await screen.findByText('Affichage de 16 à 30 sur 35 clients');
  assert.ok(calls.some(url=>new URL(url,'http://localhost').searchParams.get('page')==='2'));
  fireEvent.click(screen.getByRole('button',{name:'Précédent'}));
  await screen.findByText('Affichage de 1 à 15 sur 35 clients');
  fireEvent.click(screen.getByRole('button',{name:'Suivant'}));
  await screen.findByText('Affichage de 16 à 30 sur 35 clients');
  fireEvent.click(screen.getByRole('button',{name:'Suivant'}));
  await screen.findByText('Affichage de 31 à 35 sur 35 clients');
  assert.equal((screen.getByRole('button',{name:'Suivant'}) as HTMLButtonElement).disabled,true);
  fireEvent.change(screen.getByLabelText('Clients par page'),{target:{value:'30'}});
  await screen.findByText('Affichage de 1 à 30 sur 35 clients');
  assert.ok(screen.getByText('Page 1 sur 2'));
  fireEvent.change(screen.getAllByRole('combobox')[0]!,{target:{value:'Professionnel'}});
  await screen.findByText('Affichage de 1 à 17 sur 17 clients');
  assert.ok(calls.some(url=>new URL(url,'http://localhost').searchParams.get('type')==='company'&&new URL(url,'http://localhost').searchParams.get('page')==='1'));
  fireEvent.change(screen.getAllByRole('combobox')[0]!,{target:{value:'ALL'}});
  fireEvent.change(screen.getByPlaceholderText(/Rechercher par nom/),{target:{value:'Client 35'}});
  await waitFor(()=>assert.ok(calls.some(url=>new URL(url,'http://localhost').searchParams.get('search')==='Client 35')),{timeout:1500});
  assert.ok(screen.getByText('Affichage de 1 à 1 sur 1 clients'));
  fireEvent.click(screen.getByRole('link',{name:/Ouvrir la fiche 360° de Client 35 Pagination/}));
  assert.ok(screen.getByText('Fiche client ouverte'));
  cleanup();client.clear();
});
