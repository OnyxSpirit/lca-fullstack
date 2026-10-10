import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {JSDOM} from 'jsdom';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';

const dom=new JSDOM('<!doctype html><div id="root"></div>',{url:'http://localhost/'});
for(const[key,value]of Object.entries({window:dom.window,document:dom.window.document,navigator:dom.window.navigator,localStorage:dom.window.localStorage,Event:dom.window.Event,HTMLElement:dom.window.HTMLElement}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});

const testing=await import('@testing-library/react');
const {AppBootstrap}=await import('../src/components/AppBootstrap.js');
const {apiRequest,markAuthSessionBoundary}=await import('../src/services/apiClient.js');
const {disconnectRealtime}=await import('../src/services/realtime.js');
const {useAuthStore}=await import('../src/stores/authStore.js');

const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const profile={id:'A',firstName:'Session',lastName:'Test',email:'session@test.local',agencyId:'1',agencyName:'Agence test',agencyCode:'AG1',avatar:null,roles:['SUPER_ADMIN'],role:{id:'1',code:'SUPER_ADMIN',isSystemSuperAdmin:true},permissions:[{code:'dashboard.view',scope:'GLOBAL'}]};

test.afterEach(()=>{testing.cleanup();disconnectRealtime();localStorage.clear()});
test.after(()=>dom.window.close());

test('bootstrap attend un refresh valide et ne déconnecte pas sur un échec temporaire des permissions',async()=>{
  markAuthSessionBoundary();
  localStorage.setItem('lca-access-token','access-expired');
  localStorage.setItem('lca-refresh-token','refresh-valid');
  localStorage.setItem('lca-auth-user',JSON.stringify({id:'A',name:'Session Test',role:'SUPER_ADMIN',roles:['SUPER_ADMIN'],agencyId:'1',agencyName:'Agence test',permissions:{}}));
  useAuthStore.setState({currentUser:{id:'A',name:'Session Test',email:'session@test.local',role:'SUPER_ADMIN',roles:['SUPER_ADMIN'],primaryRole:'SUPER_ADMIN',roleCode:'SUPER_ADMIN',roleTitle:'Super admin',avatar:'',agencyId:'1',agencyName:'Agence test',department:'',phone:'',status:'active',permissions:{}},currentAgency:{id:'1',name:'Agence test',code:'AG1',city:'',address:'',phone:'',email:'',isMain:true,isActive:true},isAuthenticated:true,allUsers:[],allAgencies:[]});

  let releaseRefresh!:()=>void,refreshStarted!:()=>void;
  const refreshPending=new Promise<void>(resolve=>{releaseRefresh=resolve});
  const refreshObserved=new Promise<void>(resolve=>{refreshStarted=resolve});
  let refreshes=0,meCalls=0,replayedWith='';
  globalThis.fetch=async(input,init)=>{
    const path=String(input),authorization=new Headers(init?.headers).get('Authorization')??'';
    if(path.endsWith('/auth/refresh')){refreshes+=1;refreshStarted();await refreshPending;return json({accessToken:'access-fresh',refreshToken:'refresh-rotated',user:profile})}
    if(path.endsWith('/auth/me')){meCalls+=1;if(meCalls===1)return json({message:'Indisponible'},503);return json({user:profile})}
    if(path.endsWith('/users/directory')){if(authorization==='Bearer access-expired')return json({message:'Expiré'},401);replayedWith=authorization;return json([])}
    if(path.endsWith('/auth/logout'))return json({success:true});
    if(path.endsWith('/agencies'))return json([]);
    return json([]);
  };

  const client=new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}});
  testing.render(React.createElement(QueryClientProvider,{client},React.createElement(AppBootstrap)));
  await refreshObserved;
  await Promise.resolve();
  assert.equal(useAuthStore.getState().isAuthenticated,true,'le bootstrap ne doit pas déconnecter pendant le refresh');
  releaseRefresh();
  await testing.waitFor(()=>assert.equal(localStorage.getItem('lca-access-token'),'access-fresh'));
  await testing.waitFor(()=>assert.equal(useAuthStore.getState().currentUser?.permissions?.['dashboard.view'],'GLOBAL'));
  assert.equal(refreshes,1);
  assert.equal(replayedWith,'Bearer access-fresh');
  assert.equal(useAuthStore.getState().isAuthenticated,true);
});
