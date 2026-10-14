import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{zonedBoundary}from'../src/modules/activity/activity.routes.js';

const route=readFileSync(new URL('../src/modules/activity/activity.routes.ts',import.meta.url),'utf8');

test('ACT-FLT-01 convertit une journée de Brazzaville en intervalle UTC semi-ouvert',()=>{
 assert.equal(zonedBoundary('2026-10-14','Date','Africa/Brazzaville'),'2026-10-13 23:00:00');
 assert.equal(zonedBoundary('2026-10-14','Date','Africa/Brazzaville',true),'2026-10-14 23:00:00');
 assert.throws(()=>zonedBoundary('2026-02-30','Date','Africa/Brazzaville'),/invalide/);
});

test('ACT-FLT-02 conserve cinq modes réels, action exacte et agrégats compatibles',()=>{
 for(const mode of['LEGACY','GLOBAL','RESOURCE','EXPLICIT','UNKNOWN'])assert.match(route,new RegExp(`'${mode}'`));
 assert.match(route,/al\.action=\?/);
 assert.match(route,/al\.context_mode=\?/);
 assert.match(route,/CONTEXTUALIZED/);
 assert.match(route,/UNRECORDED/);
});

test('ACT-FLT-03 refuse une période inversée et partage le prédicat liste PDF compteur',()=>{
 assert.match(route,/fromText&&toText&&fromText>toText/);
 assert.match(route,/La date de début doit précéder la date de fin/);
 assert.ok((route.match(/SELECT COUNT\(\*\) total\$\{filter\.base\}/g)??[]).length>=2);
 assert.match(route,/selectedRows\(filter,limit,0,'ASC'\)/);
});
