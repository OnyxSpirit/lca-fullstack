import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const analytics=readFileSync(new URL('../src/modules/hr/HrAnalytics.tsx',import.meta.url),'utf8');

test('HR-EMPTY-FE-01 les tableaux vides rendent un état vide, les KPI zéro restent visibles',()=>{
  assert.match(analytics,/data\.activeEmployees!==undefined/);
  assert.match(analytics,/data\.payroll!==undefined/);
  assert.match(analytics,/data\.headcountByAgency\.length\?/);
  assert.match(analytics,/data\.budgets\?\?\[\]/);
  assert.match(analytics,/data\.expenseCategories\?\?\[\]/);
  assert.match(analytics,/Aucune donnée disponible pour cette période/);
});

test('HR-EMPTY-FE-02 une vraie erreur backend reste affichée',()=>{
  assert.match(analytics,/error\?<Card[^>]*>Erreur de chargement : \{error\.message\}/);
});
