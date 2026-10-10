import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dashboardComparison } from '../src/modules/dashboard/dashboard.routes.js';

test('la comparaison Dashboard calcule delta et pourcentage réels', () => {
  assert.deepEqual(dashboardComparison(125,100),{current:125,previous:100,delta:25,deltaPercent:25});
  assert.deepEqual(dashboardComparison(80,100),{current:80,previous:100,delta:-20,deltaPercent:-20});
});

test('une période précédente vide ne produit jamais Infinity ou NaN', () => {
  assert.deepEqual(dashboardComparison(25,0),{current:25,previous:0,delta:25,deltaPercent:null});
});

test('les quatre combinaisons de semaines vides et non vides restent définies', () => {
  assert.deepEqual(dashboardComparison(25,10),{current:25,previous:10,delta:15,deltaPercent:150});
  assert.deepEqual(dashboardComparison(25,0),{current:25,previous:0,delta:25,deltaPercent:null});
  assert.deepEqual(dashboardComparison(0,10),{current:0,previous:10,delta:-10,deltaPercent:-100});
  assert.deepEqual(dashboardComparison(0,0),{current:0,previous:0,delta:0,deltaPercent:null});
});
