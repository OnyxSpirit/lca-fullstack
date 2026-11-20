import assert from 'node:assert/strict';
import test from 'node:test';
import { insertWithStableCode, stableCodeBase } from '../src/shared/stable-code.js';

test('AUTO-CODE-01 normalise accents, espaces et caractères spéciaux',()=>{
 assert.equal(stableCodeBase('  Électricité & carrosserie / rapide  '),'ELECTRICITE_CARROSSERIE_RAPIDE');
 assert.equal(stableCodeBase('Mercedes-Benz'),'MERCEDES_BENZ');
});

test('AUTO-CODE-02 suffixe déterministe et contrainte de longueur',async()=>{
 const attempts:string[]=[];
 const value=await insertWithStableCode(async code=>{attempts.push(code);if(attempts.length<3){const error:any=new Error('duplicate');error.code='ER_DUP_ENTRY';throw error}return{insertId:9} as any},'Documents administratifs',24);
 assert.deepEqual(attempts,['DOCUMENTS_ADMINISTRATIFS','DOCUMENTS_ADMINISTRATI_2','DOCUMENTS_ADMINISTRATI_3']);
 assert.equal(value.code,'DOCUMENTS_ADMINISTRATI_3');
 assert.ok(attempts.every(code=>code.length<=24));
});

test('AUTO-CODE-03 ne masque pas une erreur autre qu’une collision',async()=>{
 await assert.rejects(()=>insertWithStableCode(async()=>{throw new Error('database unavailable')},'Test'),/database unavailable/);
});
