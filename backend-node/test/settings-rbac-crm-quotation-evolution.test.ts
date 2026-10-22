import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {resolveVehicleRecommendation} from '../src/modules/quotations/quotation.service.js';

const source=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');

test('RBAC paramètres: migration additive sans attribution automatique',()=>{
  const migration=source('database/migrations/102_settings_section_permissions.sql');
  for(const code of ['settings.general.view','settings.general.manage','settings.documents.view','settings.documents.manage','settings.workshop_rates.view','settings.workshop_rates.manage','settings.agencies.view','settings.agencies.manage'])assert.match(migration,new RegExp(code.replaceAll('.','\\.')));
  assert.doesNotMatch(migration,/INSERT\s+(?:IGNORE\s+)?INTO\s+role_permissions/i);
});

test('RBAC paramètres: chaque route de modification exige sa permission de section',()=>{
  const routes=source('src/modules/settings/setting.routes.ts');
  for(const code of ['settings.general.manage','settings.documents.manage','settings.workshop_rates.manage','settings.agencies.manage'])assert.match(routes,new RegExp(`requirePermission\\('${code.replaceAll('.','\\.')}\\'\\)`));
});

test('CRM devis: essai précis, opportunité non ambiguë, ambiguïté et absence',()=>{
  assert.deepEqual(resolveVehicleRecommendation([{vehicleId:'7',eligible:true}],true),{recommendedVehicleId:'7',ambiguous:false});
  assert.deepEqual(resolveVehicleRecommendation([{vehicleId:'7',eligible:true}],false),{recommendedVehicleId:'7',ambiguous:false});
  assert.deepEqual(resolveVehicleRecommendation([{vehicleId:'7',eligible:true},{vehicleId:'8',eligible:true}],false),{recommendedVehicleId:null,ambiguous:true});
  assert.deepEqual(resolveVehicleRecommendation([],false),{recommendedVehicleId:null,ambiguous:false});
  assert.deepEqual(resolveVehicleRecommendation([{vehicleId:'7',eligible:false}],false),{recommendedVehicleId:null,ambiguous:false});
});
