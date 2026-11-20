import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {normalizeWorkshopVin} from '../src/modules/workshop/workshop-vehicle-normalization.js';

const valid='WBA12345678901234';

test('VIN-SOUPLE-API-01..12 validation SAV accepte I/O/Q mais refuse longueurs et caractères spéciaux',()=>{
 assert.equal(normalizeWorkshopVin(valid),valid);
 assert.equal(normalizeWorkshopVin(valid.toLowerCase()),valid);
 assert.equal(normalizeWorkshopVin(''),null);
 for(const letter of ['I','O','Q'])assert.equal(normalizeWorkshopVin(`${valid.slice(0,16)}${letter}`),`${valid.slice(0,16)}${letter}`);
 assert.equal(normalizeWorkshopVin('lo234567890123456'),'LO234567890123456');
 for(const value of [valid.slice(0,16),`${valid}X`,`${valid}XY`,`${valid.slice(0,16)}!`])assert.throws(()=>normalizeWorkshopVin(value),error=>Boolean((error as any)?.status===400));
});

test('VIN-HARM-API-09/10 les endpoints Stock et SAV appliquent une regex stricte avant INSERT',()=>{
 const stock=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8'),sav=readFileSync(new URL('../src/modules/workshop/workshop-vehicle.routes.ts',import.meta.url),'utf8');
 assert.match(stock,/\^\[A-Z0-9\]\{17\}\$/);
 assert.ok(stock.indexOf('VIN doit contenir exactement 17 caractères alphanumériques')<stock.indexOf("INSERT INTO vehicles"));
 assert.match(sav,/normalizeWorkshopVin\(body\.vin\)/);
 assert.ok(sav.indexOf('normalizeWorkshopVin(body.vin)')<sav.indexOf('INSERT INTO vehicles'));
});

test('VIN-HARM-DB-01 la colonne historique reste unique et le backend porte la contrainte 17',()=>{
 const schema=readFileSync(new URL('../database/baseline/001_initial_schema.sql',import.meta.url),'utf8');
 assert.match(schema,/CREATE TABLE vehicles[\s\S]*?vin VARCHAR\(50\) NULL UNIQUE/);
});
