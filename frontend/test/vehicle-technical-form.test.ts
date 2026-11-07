import test from'node:test';
import assert from'node:assert/strict';
import{technicalOverrides,technicalProfileValues}from'../src/modules/vehicles/TechnicalCharacteristicsForm.js';

test('le formulaire reprend les valeurs communes et conserve les textes techniques',()=>{
 const profile:any={power_ch:185,advanced_sensors:'Caméra 360°, radar',battery_cooling_function:'Circuit liquide',additional_specs:[{label:'Garde au sol',value:'190',unit:'mm'}]};
 const values=technicalProfileValues(profile);
 assert.equal(values.power_ch,185);
 assert.equal(values.advanced_sensors,'Caméra 360°, radar');
 assert.deepEqual(values.additional_specs,profile.additional_specs);
});

test('seules les différences deviennent des surcharges individuelles',()=>{
 const profile:any={power_ch:185,maximum_torque_nm:300,advanced_sensors:'Radar'};
 const values={...technicalProfileValues(profile),power_ch:180};
 const overrides=technicalOverrides(values,profile);
 assert.deepEqual(overrides,{power_ch:180});
});

test('supprimer une surcharge permet de revenir à la valeur commune',()=>{
 const profile:any={power_ch:185};
 assert.deepEqual(technicalOverrides(technicalProfileValues(profile),profile),{});
});
