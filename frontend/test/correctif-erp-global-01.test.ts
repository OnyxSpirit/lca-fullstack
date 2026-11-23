import assert from 'node:assert/strict';
import { readContractFileSync as readFileSync } from './helpers/source-contract';
import test from 'node:test';

const source = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const settings = source('src/modules/settings/DocumentMarksSettings.tsx');
const hooks = source('src/api/documentMarkHooks.ts');

test('le formulaire cachet utilise des cases accessibles et verrouille le propriétaire', () => {
  assert.match(settings, /type="checkbox"/);
  assert.match(settings, /Agence propriétaire/);
  assert.match(settings, /Sélectionner toutes les agences/);
  assert.match(settings, /indeterminate/);
  assert.match(settings, /disabled=\{disabled\|\|agency\.id===ownerId\}/);
  assert.match(settings, /stamp\.assign_agencies/);
});

test('le contrat frontend sérialise les affectations sans envoyer de propriétaire arbitraire', () => {
  assert.match(hooks, /allowedAgencyIds/);
  assert.match(hooks, /allowedAgencyIds:JSON\.stringify\(allowedAgencyIds\)/);
  assert.match(hooks, /\/agencies/);
  const createHook = hooks.slice(hooks.indexOf('useCreateStamp'), hooks.indexOf('useReplaceStamp'));
  assert.doesNotMatch(createHook, /form\.append\('agencyId'/);
});
