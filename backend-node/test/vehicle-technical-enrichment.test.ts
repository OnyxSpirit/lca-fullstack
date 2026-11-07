import test from'node:test';
import assert from'node:assert/strict';
import{effectiveTechnicalValues,freezeVehicleTechnicalSnapshot,parseTechnicalValues}from'../src/modules/vehicles/vehicle-technical-profile.js';

test('les descriptions textuelles et les caractéristiques dynamiques sont conservées',()=>{
 const values=parseTechnicalValues({advanced_sensors:'Radar avant, caméra 360°',battery_cooling_function:'Refroidissement liquide piloté',additional_specs:[{label:'Garde au sol',value:'190',unit:'mm'}],unknown:'refusé'});
 assert.equal(values.advanced_sensors,'Radar avant, caméra 360°');
 assert.equal(values.battery_cooling_function,'Refroidissement liquide piloté');
 assert.deepEqual(values.additional_specs,[{label:'Garde au sol',value:'190',unit:'mm'}]);
 assert.equal(Object.hasOwn(values,'unknown'),false);
});

test('une surcharge individuelle prime sans modifier le profil',()=>{
 const profile={power_ch:185,maximum_torque_nm:300},overrides={power_ch:180};
 const effective=effectiveTechnicalValues(profile,overrides,null);
 assert.equal((effective.values as any).power_ch,180);
 assert.equal((effective.values as any).maximum_torque_nm,300);
 assert.equal(effective.origins.power_ch,'individual');
 assert.equal(effective.origins.maximum_torque_nm,'profile');
 assert.equal(profile.power_ch,185);
});

test('un snapshot figé reste prioritaire sur le profil courant',()=>{
 const effective=effectiveTechnicalValues({power_ch:190},{power_ch:180},{power_ch:185});
 assert.equal((effective.values as any).power_ch,185);
 assert.equal(effective.origins.power_ch,'snapshot');
});

test('le gel historique ne remplace pas un snapshot existant',async()=>{
 const calls:Array<{sql:string;params:unknown[]}>=[];
 const executor={execute:async(sql:string,params:unknown[])=>{calls.push({sql,params});if(sql.startsWith('SELECT version_id'))return[[{version_id:1,technical_overrides:'{}',technical_snapshot:'{"power_ch":175}'}],[]] as any;return[{},[]] as any}};
 await freezeVehicleTechnicalSnapshot(executor as any,'42');
 assert.equal(calls.length,2);
 assert.match(calls[1]!.sql,/COALESCE\(technical_snapshot/);
 assert.equal(calls[1]!.params[0],JSON.stringify({power_ch:175}));
});
