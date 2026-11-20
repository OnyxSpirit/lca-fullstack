import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {hasVinStandardExcludedLetters,normalizeVinInput,VIN_CONFORMITY_WARNING,VIN_PATTERN} from '../src/modules/vehicles/vehicleVin.js';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const valid='WBA12345678901234';

test('VIN-HARM-UI-01..06 saisie 16/17/18/19 et collages restent bornés dans l’état',()=>{
 assert.equal(normalizeVinInput(valid.slice(0,16)),valid.slice(0,16));
 assert.equal(normalizeVinInput(valid),valid);
 assert.equal(normalizeVinInput(`${valid}X`),valid);
 assert.equal(normalizeVinInput(`${valid}XY`),valid);
 assert.equal(normalizeVinInput(`${valid}ABCDEFGH`),valid);
 assert.ok([valid,`${valid}X`,`${valid}ABCDEFGH`].every(value=>normalizeVinInput(value).length===17));
});

test('VIN-HARM-UI-07..09 suppression, remplacement et majuscules restent possibles',()=>{
 const deleted=normalizeVinInput(valid).slice(0,-1),replaced=normalizeVinInput(`${valid.slice(0,5)}Z${valid.slice(6)}`);
 assert.equal(deleted.length,16);
 assert.equal(replaced[5],'Z');
 assert.equal(normalizeVinInput(valid.toLowerCase()),valid);
});

test('VIN-HARM-UI-10..12 validation technique distingue incomplet, valide et caractères spéciaux',()=>{
 assert.equal(VIN_PATTERN.test(valid.slice(0,16)),false);
 assert.equal(VIN_PATTERN.test(valid),true);
 for(const forbidden of ['!','_','é','/'])assert.equal(VIN_PATTERN.test(`${valid.slice(0,16)}${forbidden}`),false);
});

test('VIN-SOUPLE-UI-01..08 I, O et Q sont acceptés et produisent un avertissement réversible',()=>{
 for(const letter of ['I','O','Q']){
  const vin=`${valid.slice(0,16)}${letter}`;
  assert.equal(VIN_PATTERN.test(vin),true);
  assert.equal(hasVinStandardExcludedLetters(vin),true);
 }
 assert.equal(hasVinStandardExcludedLetters('lo234567890123456'),true);
 assert.equal(hasVinStandardExcludedLetters(valid),false);
 assert.equal(hasVinStandardExcludedLetters(`${valid.slice(0,16)}Z`),false);
 assert.match(VIN_CONFORMITY_WARNING,/I, O ou Q/);
});

test('VIN-HARM-UI-13..16 les deux formulaires combinent limite HTML et normalisation contrôlée',()=>{
 const stock=read('src/modules/vehicles/NewVehicleModal.tsx'),sav=read('src/modules/service/NewRepairOrderModal.tsx');
 assert.match(stock,/maxLength=\{17\}/);
 assert.match(stock,/name === ["']vin["'] \? normalizeVinInput\(value\) : value/);
 assert.match(sav,/maxLength=\{key==='vin'\?17:undefined\}/);
 assert.match(sav,/vin:normalizeVinInput\(change\.vin\)/);
 assert.match(stock,/vinConformityWarning &&/);
 assert.match(sav,/hasVinStandardExcludedLetters\(externalForm\.vin\)&&/);
 assert.match(stock,/role="status"/);
 assert.match(sav,/role="status"/);
 assert.match(sav,/externalForm\.vin&&!VIN_PATTERN\.test\(externalForm\.vin\)/);
});

test('VIN-HARM-UI-17 la recherche SAV utilise la valeur normalisée et aucun décodeur VIN externe',()=>{
 const sav=read('src/modules/service/NewRepairOrderModal.tsx'),hooks=read('src/api/erpHooks.ts'),stock=read('src/modules/vehicles/NewVehicleModal.tsx');
 assert.match(sav,/vehicleLookup=\{vin:externalForm\.vin\.trim\(\)/);
 assert.match(hooks,/\/workshop\/vehicles\/search\?/);
 assert.doesNotMatch(`${sav}\n${stock}`,/decodeVin|vinDecoder|nhtsa|vpic/i);
});
