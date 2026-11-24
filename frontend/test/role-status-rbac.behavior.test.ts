import assert from'node:assert/strict';
import test,{afterEach}from'node:test';
import React from'react';
import{JSDOM}from'jsdom';
import{QueryClient,QueryClientProvider}from'@tanstack/react-query';

const dom=new JSDOM('<!doctype html><html><body></body></html>',{url:'http://localhost/users',pretendToBeVisual:true});
for(const[key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,HTMLElement:dom.window.HTMLElement,Node:dom.window.Node,Event:dom.window.Event,MutationObserver:dom.window.MutationObserver,localStorage:dom.window.localStorage,FormData:dom.window.FormData,IS_REACT_ACT_ENVIRONMENT:true}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
const testing=await import('@testing-library/react');
const{useAuthStore}=await import('../src/stores/authStore.js');
const{useUiStore}=await import('../src/stores/uiStore.js');
const{RoleManagementPanel}=await import('../src/modules/users/RoleManagementPanel.js');

const role=(active:boolean)=>({id:'41',code:'AUDIT_ROLE',name:'Rôle audit',description:'Qualification',is_system:false,is_active:active,user_count:1});
const authenticate=()=>useAuthStore.setState({currentUser:{id:'1',name:'Admin',email:'admin@test.local',role:'ADMIN',roles:['ADMIN'],primaryRole:'ADMIN',roleTitle:'Administrateur',avatar:'',agencyId:'1',agencyName:'Agence A',department:'',phone:'',status:'active',permissions:{'roles.view':'AGENCY','roles.disable':'AGENCY'}},isAuthenticated:true});
const renderPanel=()=>{const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false}}});return{client,...testing.render(React.createElement(QueryClientProvider,{client},React.createElement(RoleManagementPanel)))}};

afterEach(()=>{testing.cleanup();useUiStore.setState({toasts:[]});dom.window.localStorage.clear()});

test('RBAC-R05..R11 désactive, actualise le badge puis réactive le rôle',async()=>{
 authenticate();let active=true;const bodies:boolean[]=[];
 globalThis.fetch=async(input,init)=>{const url=String(input);if(url.endsWith('/api/roles')&&(!init?.method||init.method==='GET'))return Response.json([role(active)]);if(url.endsWith('/api/roles/41/status')){const body=JSON.parse(String(init?.body));bodies.push(body.isActive);active=body.isActive;return Response.json(role(active))}throw new Error(`Requête inattendue ${url}`)};
 renderPanel();await testing.screen.findByText('Actif');const disable=testing.screen.getByRole('button',{name:'Désactiver'});testing.fireEvent.click(disable);
 await testing.screen.findByText('Inactif');assert.ok(testing.screen.getByRole('button',{name:'Réactiver'}));assert.equal(useUiStore.getState().toasts.at(-1)?.title,'Rôle désactivé');
 testing.fireEvent.click(testing.screen.getByRole('button',{name:'Réactiver'}));await testing.screen.findByText('Actif');assert.ok(testing.screen.getByRole('button',{name:'Désactiver'}));assert.deepEqual(bodies,[false,true]);assert.equal(useUiStore.getState().toasts.at(-1)?.title,'Rôle réactivé');
});

test('RBAC-R14 un double clic ne soumet qu’une désactivation',async()=>{
 authenticate();let release!:(response:Response)=>void,calls=0,active=true;const pending=new Promise<Response>(resolve=>release=resolve);
 globalThis.fetch=async(input,init)=>{const url=String(input);if(url.endsWith('/api/roles')&&(!init?.method||init.method==='GET'))return Response.json([role(active)]);if(url.endsWith('/api/roles/41/status')){calls++;return pending}throw new Error(`Requête inattendue ${url}`)};
 renderPanel();const button=await testing.screen.findByRole('button',{name:'Désactiver'});testing.fireEvent.click(button);testing.fireEvent.click(button);await testing.waitFor(()=>assert.equal(calls,1));active=false;release(Response.json(role(false)));await testing.screen.findByText('Inactif');
});

test('RBAC-R39 un échec API conserve le dernier statut confirmé',async()=>{
 authenticate();globalThis.fetch=async(input,init)=>{const url=String(input);if(url.endsWith('/api/roles')&&(!init?.method||init.method==='GET'))return Response.json([role(true)]);if(url.endsWith('/api/roles/41/status'))return Response.json({message:'Refus simulé'},{status:500});throw new Error(`Requête inattendue ${url}`)};
 renderPanel();testing.fireEvent.click(await testing.screen.findByRole('button',{name:'Désactiver'}));await testing.waitFor(()=>assert.equal(useUiStore.getState().toasts.at(-1)?.title,'Désactivation impossible'));assert.ok(testing.screen.getByText('Actif'));assert.ok(testing.screen.getByRole('button',{name:'Désactiver'}));
});
