import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {JSDOM} from 'jsdom';

const dom=new JSDOM('<!doctype html>',{url:'http://localhost/'});
Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});
Object.defineProperty(globalThis,'localStorage',{value:dom.window.localStorage,configurable:true});
const {apiDownload}=await import('../src/services/apiClient.js');
const page=readFileSync(new URL('../src/modules/deliveries/DeliveryDetailPage.tsx',import.meta.url),'utf8');

test.beforeEach(()=>localStorage.clear());

test('F1 le bouton utilise le téléchargement API authentifié et obtient le fichier',async()=>{
  localStorage.setItem('lca-access-token','token-A');
  let authorization='';
  globalThis.fetch=async(_input,init)=>{authorization=new Headers(init?.headers).get('Authorization')??'';return new Response(new Blob(['PDF']),{status:200,headers:{'Content-Type':'application/pdf'}})};
  const blob=await apiDownload('/deliveries/10/documents/20/download');
  assert.equal(await blob.text(),'PDF');assert.equal(authorization,'Bearer token-A');
  assert.match(page,/apiDownload\(`\/deliveries\/\$\{id\}\/documents\/\$\{document\.id\}\/download`\)/);
});

test('F2/F3 les refus 401, 403 et 404 ne produisent aucun fichier',async()=>{
  localStorage.setItem('lca-access-token','token-A');
  for(const status of[401,403,404]){globalThis.fetch=async()=>new Response(JSON.stringify({message:'Refus'}),{status,headers:{'Content-Type':'application/json'}});await assert.rejects(apiDownload('/deliveries/10/documents/20/download'),error=>Boolean(error&&typeof error==='object'&&'status'in error&&error.status===status))}
});

test('F4 une réponse de téléchargement A est rejetée après ouverture de B',async()=>{
  localStorage.setItem('lca-access-token','token-A');
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve});
  globalThis.fetch=async()=>{await pending;return new Response(new Blob(['A_ONLY']),{status:200})};
  const download=apiDownload('/deliveries/10/documents/20/download');
  localStorage.setItem('lca-access-token','token-B');release();
  await assert.rejects(download,/session a changé/i);
});

test('F5 aucun JWT ni URL publique Livraison n’est construit',()=>{
  assert.doesNotMatch(page,/token=|accessToken=|\/uploads\/deliveries/);
  assert.match(page,/apiDownload/);
});
