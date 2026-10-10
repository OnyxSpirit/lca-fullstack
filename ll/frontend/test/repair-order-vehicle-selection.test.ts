import assert from 'node:assert/strict';
import test from 'node:test';
import {selectCustomerVehicle} from '../src/modules/service/repairOrderVehicleSelection.js';

test('aucun véhicule: aucune sélection',()=>assert.equal(selectCustomerVehicle([]),''));
test('véhicule unique: sélection automatique',()=>assert.equal(selectCustomerVehicle(['7']),'7'));
test('plusieurs véhicules: choix manuel',()=>assert.equal(selectCustomerVehicle(['7','8']),''));
test('contexte prérempli appartenant au client',()=>assert.equal(selectCustomerVehicle(['7','8'],'8'),'8'));
test('ancien véhicule absent après changement de client',()=>assert.equal(selectCustomerVehicle(['9','10'],'7'),''));
test('nouveau client avec véhicule unique après changement',()=>assert.equal(selectCustomerVehicle(['9'],'7'),'9'));
