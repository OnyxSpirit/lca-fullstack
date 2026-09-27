import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {normalizeVinInput,VIN_PATTERN} from '../src/modules/vehicles/vehicleVin.js';

const crm=readFileSync(new URL('../src/modules/crm/CrmPage.tsx',import.meta.url),'utf8');
const hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');
const vehicle=readFileSync(new URL('../src/modules/vehicles/NewVehicleModal.tsx',import.meta.url),'utf8');

test('CRM-TEAM-01/02/03 charge dynamiquement les membres et conserve Toute l’équipe',()=>{
  assert.match(hooks,/useCrmTeamMembersQuery/);
  assert.match(hooks,/\/crm\/team-members/);
  assert.match(crm,/useCrmTeamMembersQuery\(canAssignLead\)/);
  assert.match(crm,/<option value="">Toute l’équipe<\/option>/);
});

test('CRM-TEAM-04/05 sélection et remise à Toute l’équipe pilotent commercialId',()=>{
  assert.match(crm,/value=\{selectedCommercial\}/);
  assert.match(crm,/setSelectedCommercial\(e\.target\.value\)/);
  assert.match(crm,/useLeadsQuery\([^;]+selectedCommercial\)/);
  assert.match(hooks,/if \(commercialId\) params\.set\("commercialId", commercialId\)/);
});

test('VIN-01..06 saisie, dix-septième caractère et collage partagent la même source de vérité',()=>{
  const short=normalizeVinInput('wba123');
  const exact=normalizeVinInput('wba12345678901234');
  const typed=normalizeVinInput('wba12345678901234x');
  const pasted=normalizeVinInput(' 1HGCM82633A004352XYZ ');
  assert.equal(short,'WBA123');
  assert.equal(exact,'WBA12345678901234');
  assert.equal(typed,exact);
  assert.equal(pasted,'1HGCM82633A004352');
  assert.equal(typed.length,17);
  assert.equal(VIN_PATTERN.test(typed),true);
  assert.match(vehicle,/name === ["']vin["'] \? normalizeVinInput\(value\) : value/);
  assert.match(vehicle,/value=\{form\.vin\}/);
  assert.match(vehicle,/vin: normalizedVin|vin:normalizedVin/);
});

test('VIN-07/08 création normalisée et modification ne réécrit pas le VIN',()=>{
  assert.match(vehicle,/maxLength=\{17\}/);
  assert.match(vehicle,/VIN_PATTERN\.test\(normalizedVin\)/);
});
