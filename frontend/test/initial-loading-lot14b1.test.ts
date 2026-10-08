import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {JSDOM} from 'jsdom';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('LOT14B1-01 login ne référence statiquement ni le layout authentifié ni Socket.IO',()=>{
  const app=read('src/App.tsx'),realtime=read('src/services/realtime.ts');
  assert.match(app,/const AppLayout=lazy\(\(\)=>import\('\.\/components\/layout\/AppLayout'\)/);
  assert.doesNotMatch(app,/import \{ AppLayout \} from/);
  assert.match(realtime,/import type \{ Socket \} from 'socket\.io-client'/);
  assert.match(realtime,/await import\('socket\.io-client'\)/);
});

test('LOT14B1-02 le bootstrap métier vit dans le layout protégé',()=>{
  const app=read('src/App.tsx'),layout=read('src/components/layout/AppLayout.tsx');
  assert.match(app,/isAuthenticated \? lazyPage\(<AppLayout \/>\)/);
  assert.match(layout,/import \{ AppBootstrap \}/);
  assert.match(layout,/<AppBootstrap \/>/);
  assert.doesNotMatch(app,/<AppBootstrap \/>/);
});

test('LOT14B1-03 le store ne crée plus une deuxième connexion au login',()=>{
  const store=read('src/stores/authStore.ts');
  assert.doesNotMatch(store,/import \{ connectRealtime/);
  assert.doesNotMatch(store,/connectRealtime\(response\.accessToken\)/);
  assert.match(store,/disconnectRealtime\(\)/);
});

test('LOT14B1-04 un import Socket.IO résolu après annulation ne crée aucune connexion',async()=>{
  const dom=new JSDOM('<!doctype html>',{url:'http://localhost/'});
  Object.defineProperty(globalThis,'window',{value:dom.window,configurable:true});
  const realtime=await import('../src/services/realtime.js');
  const pending=realtime.connectRealtime('obsolete-token');
  realtime.disconnectRealtime();
  assert.equal(await pending,null);
  assert.equal(realtime.getRealtimeSocket(),null);
  dom.window.close();
});

test('LOT14B1-05 le bootstrap reprend le token courant si un refresh termine pendant l’import',()=>{
  const bootstrap=read('src/components/AppBootstrap.tsx');
  assert.match(bootstrap,/const currentToken=localStorage\.getItem\('lca-access-token'\)/);
  assert.match(bootstrap,/if\(currentToken===activeToken\)break/);
  assert.match(bootstrap,/activeToken=currentToken;socket=await connectRealtime\(activeToken\)/);
});
