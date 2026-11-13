import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {normalizeVinInput,VIN_PATTERN} from '../src/modules/vehicles/vehicleVin.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('VIN-LCA-01 tronque toujours l’état à 17 caractères',()=>{
  for(const length of [0,1,16,17,18,25,40])assert.ok(normalizeVinInput('A'.repeat(length)).length<=17);
  assert.equal(normalizeVinInput('a'.repeat(40)),'A'.repeat(17));
  assert.equal(normalizeVinInput(' 1hg-cm82633-a004352 xyz '),'1HGCM82633A004352');
  assert.equal(VIN_PATTERN.test(normalizeVinInput('1HGCM82633A004352')),true);
  assert.equal(VIN_PATTERN.test(normalizeVinInput('1HGCM82633I004352')),false);
  assert.equal(normalizeVinInput(''),'');
  assert.equal(normalizeVinInput('A'.repeat(17)).slice(0,-1)+'B','A'.repeat(16)+'B');
});

test('VIN-LCA-02 les deux formulaires normalisent avant état et payload',()=>{
  const stock=read('../src/modules/vehicles/NewVehicleModal.tsx');
  const workshop=read('../src/modules/service/NewRepairOrderModal.tsx');
  assert.match(stock,/name === ["']vin["'] \? normalizeVinInput\(value\) : value/);
  assert.match(stock,/vin:\s*normalizedVin/);
  assert.match(workshop,/vin:normalizeVinInput\(change\.vin\)/);
  assert.match(workshop,/setExternalForm\(current=>\(\{\.\.\.current,\.\.\.normalized\}\)\)/);
  assert.match(workshop,/setExternalForm\(emptyExternal\(\)\)/);
});

test('DEL-LCA-01 le fac-similé PNG client est facultatif sans supprimer le consentement',()=>{
  const page=read('../src/modules/deliveries/DeliveryDetailPage.tsx');
  assert.doesNotMatch(page,/documentsComplete\|\|!accepted\|\|!signature\|\|!signer/);
  assert.match(page,/\.\.\.\(signature\?\{signatureData:signature\}:\{\}\)/);
  assert.match(page,/consentText:'Le client confirme/);
});
