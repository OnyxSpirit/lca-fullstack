import assert from 'node:assert/strict';
import test from 'node:test';
import {selectCustomerVehicle,vehiclesForRepairOrderMode} from '../src/modules/service/repairOrderVehicleSelection.js';

test('aucun véhicule: aucune sélection',()=>assert.equal(selectCustomerVehicle([]),''));
test('véhicule unique: sélection automatique',()=>assert.equal(selectCustomerVehicle(['7']),'7'));
test('plusieurs véhicules: choix manuel',()=>assert.equal(selectCustomerVehicle(['7','8']),''));
test('contexte prérempli appartenant au client',()=>assert.equal(selectCustomerVehicle(['7','8'],'8'),'8'));
test('ancien véhicule absent après changement de client',()=>assert.equal(selectCustomerVehicle(['9','10'],'7'),''));
test('nouveau client avec véhicule unique après changement',()=>assert.equal(selectCustomerVehicle(['9'],'7'),'9'));
test('parcours interne: seuls les véhicules CONCESSION sont sélectionnables',()=>assert.deepEqual(vehiclesForRepairOrderMode([{id:'1',commercialOrigin:'CONCESSION'},{id:'2',commercialOrigin:'EXTERNAL'},{id:'3',commercialOrigin:'UNKNOWN'}],'internal').map(v=>v.id),['1']));
test('parcours extérieur: seuls les véhicules EXTERNAL sont réutilisables',()=>assert.deepEqual(vehiclesForRepairOrderMode([{id:'1',commercialOrigin:'CONCESSION'},{id:'2',commercialOrigin:'EXTERNAL'},{id:'3',commercialOrigin:'UNKNOWN'}],'external').map(v=>v.id),['2']));
test('UNKNOWN ne déclenche aucune présélection interne',()=>assert.equal(selectCustomerVehicle(vehiclesForRepairOrderMode([{id:'3',commercialOrigin:'UNKNOWN'}],'internal').map(v=>v.id)),''));
