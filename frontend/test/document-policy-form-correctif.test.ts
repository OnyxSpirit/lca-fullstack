import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const form=readFileSync(new URL('../src/modules/settings/DocumentPolicyForm.tsx',import.meta.url),'utf8');
const settings=readFileSync(new URL('../src/modules/settings/DocumentMarksSettings.tsx',import.meta.url),'utf8');

test('CORRECTIF chaque document possède sa mutation et son état de sauvegarde',()=>{
  assert.match(form,/useMutation\(\{/);
  assert.match(form,/mutationKey:\['document-marks','policy',type\.code\]/);
  assert.match(form,/loading=\{save\.isPending\}/);
  assert.doesNotMatch(settings,/admin\.savePolicy\.isPending/);
});

test('CORRECTIF les retours de sauvegarde identifient le document concerné',()=>{
  assert.match(form,/Règles d’émission enregistrées — \$\{type\.label\}/);
  assert.match(form,/Enregistrement impossible — \$\{type\.label\}/);
  assert.match(form,/queryKey:\['document-marks','policies'\]/);
});

test('CORRECTIF les libellés expliquent les règles d’émission et les documents autorisés',()=>{
  for(const label of[
    'Documents officiels · Règles d’émission',
    'Définissez, pour chaque document, si une signature ou un cachet est requis et le comportement à appliquer lorsqu’un élément manque.',
    'Documents autorisés',
    'Sélectionnez les types de documents sur lesquels ce cachet peut être utilisé. Cette sélection ne rend pas son utilisation obligatoire.',
  ]) assert.match(settings,new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(form,/issued:'Émission'/);
  assert.match(form,/confirmed:'Confirmation'/);
});
