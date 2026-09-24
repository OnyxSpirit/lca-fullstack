import assert from 'node:assert/strict';
import test from 'node:test';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html>',{url:'http://localhost/'});
Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
Object.defineProperty(globalThis,'Event',{value:dom.window.Event,configurable:true});
const {queryClient}=await import('../src/queryClient.js');
const {apiDownload,apiRequest,markAuthSessionBoundary}=await import('../src/services/apiClient.js');
const {useAuthStore}=await import('../src/stores/authStore.js');
const {disconnectRealtime}=await import('../src/services/realtime.js');
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
const install=(id:string)=>{markAuthSessionBoundary();localStorage.setItem('lca-access-token',`access-${id}`);localStorage.setItem('lca-refresh-token',`refresh-${id}`);localStorage.setItem('lca-auth-user',JSON.stringify({id,agencyId:`agency-${id}`}));};

test.beforeEach(()=>{markAuthSessionBoundary();localStorage.clear();queryClient.clear();globalThis.fetch=async()=>json({ok:true});});
test.after(()=>{disconnectRealtime();queryClient.clear();dom.window.close()});

async function successfulBurst(size:number){
  install('A');let refreshes=0;const attempts=new Map<string,number>(),replayTokens:string[]=[];
  globalThis.fetch=async(input,init)=>{const path=String(input),authorization=new Headers(init?.headers).get('Authorization');if(path.endsWith('/auth/refresh')){refreshes+=1;await Promise.resolve();return json({accessToken:'access-A2',refreshToken:'refresh-A2'})}const count=(attempts.get(path)??0)+1;attempts.set(path,count);if(count===1)return json({message:'Expired'},401);replayTokens.push(authorization??'');return json({path})};
  const results=await Promise.all(Array.from({length:size},(_,index)=>apiRequest<{path:string}>(`/burst/${index}`,{method:'POST',headers:{'X-Business':'kept'},body:JSON.stringify({index})})));
  return{refreshes,attempts,replayTokens,results};
}

test('F1–F6/F15/F16 et rafales 10/50 utilisent un unique refresh et un replay',async()=>{
  queryClient.setQueryData(['keep'],{value:true});
  for(const size of[10,50]){const result=await successfulBurst(size);assert.equal(result.refreshes,1);assert.equal(result.attempts.size,size);assert.equal([...result.attempts.values()].every(value=>value===2),true);assert.deepEqual(new Set(result.replayTokens),new Set(['Bearer access-A2']));}
  assert.deepEqual(queryClient.getQueryData(['keep']),{value:true});
});

test('F7–F9 refresh invalide termine et notifie une seule fois sans replay',async()=>{
  install('A');queryClient.setQueryData(['secret'],{owner:'A'});let refreshes=0,business=0,expired=0;window.addEventListener('lca:session-expired',()=>{expired+=1});
  globalThis.fetch=async input=>{if(String(input).endsWith('/auth/refresh')){refreshes+=1;return json({message:'Refresh token invalide'},401)}business+=1;return json({message:'Expired'},401)};
  const results=await Promise.allSettled(Array.from({length:10},(_,index)=>apiRequest(`/invalid/${index}`)));
  assert.equal(results.every(result=>result.status==='rejected'),true);assert.equal(refreshes,1);assert.equal(business,10);assert.equal(expired,1);assert.equal(queryClient.getQueryData(['secret']),undefined);assert.equal(localStorage.getItem('lca-access-token'),null);
});

test('F10/F11 un replay 401 et /auth/refresh ne bouclent jamais',async()=>{
  install('A');let refreshes=0,business=0;globalThis.fetch=async input=>{if(String(input).endsWith('/auth/refresh')){refreshes+=1;return json({accessToken:'access-A2',refreshToken:'refresh-A2'})}business+=1;return json({message:'Toujours 401'},401)};
  await assert.rejects(apiRequest('/still-unauthorized'));assert.equal(refreshes,1);assert.equal(business,2);
  refreshes=0;globalThis.fetch=async()=>{refreshes+=1;return json({message:'Non'},401)};await assert.rejects(apiRequest('/auth/refresh',{method:'POST'}));assert.equal(refreshes,1);
});

test('F12/F16 une erreur réseau ne révoque pas et libère le single-flight',async()=>{
  install('A');let refreshes=0,business=0;globalThis.fetch=async input=>{if(String(input).endsWith('/auth/refresh')){refreshes+=1;if(refreshes===1)throw new TypeError('offline');if(refreshes===2)return json({message:'Indisponible'},503);return json({accessToken:'access-A2',refreshToken:'refresh-A2'})}business+=1;return business<=3?json({message:'Expired'},401):json({ok:true})};
  await assert.rejects(apiRequest('/network'),/offline/);assert.equal(localStorage.getItem('lca-access-token'),'access-A');await assert.rejects(apiRequest('/network'),error=>(error as any).status===503);assert.equal(localStorage.getItem('lca-access-token'),'access-A');assert.deepEqual(await apiRequest('/network'),{ok:true});assert.equal(refreshes,3);
});

test('F13 une requête annulée pendant le refresh n’est pas rejouée',async()=>{
  install('A');const controller=new AbortController();let release!:()=>void,requests=0;const pending=new Promise<void>(resolve=>{release=resolve});globalThis.fetch=async input=>{if(String(input).endsWith('/auth/refresh')){await pending;return json({accessToken:'access-A2',refreshToken:'refresh-A2'})}requests+=1;return json({message:'Expired'},401)};
  const request=apiRequest('/abort',{signal:controller.signal});controller.abort();release();await assert.rejects(request,error=>(error as Error).name==='AbortError');assert.equal(requests,1);
});

test('F14 download partage le single-flight et rejette les réponses anciennes',async()=>{
  install('A');let refreshes=0,downloads=0;globalThis.fetch=async input=>{if(String(input).endsWith('/auth/refresh')){refreshes+=1;return json({accessToken:'access-A2',refreshToken:'refresh-A2'})}downloads+=1;if(downloads<=2)return json({message:'Expired'},401);return new Response(new Blob(['PDF']))};
  const blobs=await Promise.all([apiDownload('/document/a'),apiDownload('/document/b')]);assert.equal(refreshes,1);assert.equal(downloads,4);assert.deepEqual(await Promise.all(blobs.map(blob=>blob.text())),['PDF','PDF']);
});

test('F15 méthode, headers et body sont préservés, Authorization est remplacé',async()=>{
  install('A');const seen:Array<{method?:string|null;authorization:string|null;business:string|null;body:unknown}>=[];globalThis.fetch=async(input,init)=>{if(String(input).endsWith('/auth/refresh'))return json({accessToken:'access-A2',refreshToken:'refresh-A2'});seen.push({method:init?.method,authorization:new Headers(init?.headers).get('Authorization'),business:new Headers(init?.headers).get('X-Business'),body:init?.body});return seen.length===1?json({message:'Expired'},401):json({ok:true})};
  await apiRequest('/preserve',{method:'PATCH',headers:{Authorization:'Bearer stale','X-Business':'yes','Content-Type':'application/custom'},body:'BODY'});assert.deepEqual(seen,[{method:'PATCH',authorization:'Bearer access-A',business:'yes',body:'BODY'},{method:'PATCH',authorization:'Bearer access-A2',business:'yes',body:'BODY'}]);
});

test('F15 FormData réellement utilisé par les uploads reste rejouable et inchangé',async()=>{
  install('A');const form=new FormData();form.set('file',new Blob(['PDF'],{type:'application/pdf'}),'document.pdf');const bodies:unknown[]=[],contentTypes:Array<string|null>=[];globalThis.fetch=async(input,init)=>{if(String(input).endsWith('/auth/refresh'))return json({accessToken:'access-A2',refreshToken:'refresh-A2'});bodies.push(init?.body);contentTypes.push(new Headers(init?.headers).get('Content-Type'));return bodies.length===1?json({message:'Expired'},401):json({ok:true})};await apiRequest('/upload',{method:'POST',body:form});assert.deepEqual(bodies,[form,form]);assert.deepEqual(contentTypes,[null,null]);
});

test('S1–S10 logout/login B pendant refresh A protège intégralement B',async()=>{
  install('A');let release!:()=>void,refreshStarted!:()=>void;const started=new Promise<void>(resolve=>{refreshStarted=resolve}),pending=new Promise<void>(resolve=>{release=resolve});let business=0;
  globalThis.fetch=async input=>{const path=String(input);if(path.endsWith('/auth/refresh')){refreshStarted();await pending;return json({accessToken:'access-A2',refreshToken:'refresh-A2'})}if(path.endsWith('/auth/logout'))return new Response(null,{status:204});if(path.endsWith('/auth/login'))return json({accessToken:'access-B',refreshToken:'refresh-B',user:{id:'B',firstName:'User',lastName:'B',email:'b@test.local',agencyId:'agency-B',agencyName:'Agency B',agencyCode:'B',avatar:null,roles:['EMPLOYEE'],role:{id:'B',code:'EMPLOYEE'},permissions:[]}});business+=1;return json({message:'Expired'},401)};
  const requests=Array.from({length:10},(_,index)=>apiRequest(`/session-race/${index}`));await started;useAuthStore.getState().logout();assert.equal((await useAuthStore.getState().login('b@test.local','password')).success,true);queryClient.setQueryData(['B'],{owner:'B'});release();const results=await Promise.allSettled(requests);
  assert.equal(results.every(result=>result.status==='rejected'),true);assert.equal(business,10);assert.equal(localStorage.getItem('lca-access-token'),'access-B');assert.equal(localStorage.getItem('lca-refresh-token'),'refresh-B');assert.deepEqual(queryClient.getQueryData(['B']),{owner:'B'});
});

test('G1–G5 changement agence pendant refresh invalide le contexte précédent',async()=>{
  install('A');let release!:()=>void,started!:()=>void;const waiting=new Promise<void>(resolve=>{started=resolve}),pending=new Promise<void>(resolve=>{release=resolve});let calls=0;globalThis.fetch=async input=>{if(String(input).endsWith('/auth/refresh')){started();await pending;return json({accessToken:'access-A2',refreshToken:'refresh-A2'})}calls+=1;return json({message:'Expired'},401)};
  useAuthStore.setState({currentAgency:{id:'agency-X',name:'X',code:'X',city:'',address:'',phone:'',email:'',isMain:true,isActive:true}});const request=apiRequest('/agency-X');await waiting;useAuthStore.getState().setCurrentAgency({id:'agency-Y',name:'Y',code:'Y',city:'',address:'',phone:'',email:'',isMain:false,isActive:true});queryClient.setQueryData(['agency-Y'],{scope:'Y'});release();await assert.rejects(request,/session a changé/i);assert.equal(calls,1);assert.deepEqual(queryClient.getQueryData(['agency-Y']),{scope:'Y'});assert.equal(localStorage.getItem('lca-access-token'),'access-A');
});
