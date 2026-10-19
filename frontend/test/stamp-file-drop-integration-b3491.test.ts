import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const settings=readFileSync(new URL('../src/modules/settings/DocumentMarksSettings.tsx',import.meta.url),'utf8');
const ged=readFileSync(new URL('../src/modules/documents/DocumentFileDropField.tsx',import.meta.url),'utf8');

test('B3491 le formulaire du cachet réutilise la zone GED en mode image strict',()=>{
  assert.match(settings,/DocumentFileDropField/);assert.match(settings,/acceptedTypes=\{\['image\/png','image\/jpeg'\]\}/);assert.match(settings,/maxSize=\{2\*1024\*1024\}/);assert.match(settings,/rejectInvalid/);assert.match(settings,/PNG ou JPEG — maximum 2 Mio/);
});

test('B3491 la sélection seule ne déclenche pas la mutation et le dépôt ne bloque pas le submit',()=>{
  assert.match(settings,/<form[\s\S]*onSubmit=/);assert.match(settings,/onChange=\{setFile\}/);assert.match(settings,/required=\{false\}/);assert.match(settings,/stampActions\.create\.mutateAsync/);assert.doesNotMatch(settings,/onChange=\{[^}]*stampActions\.create/);
});

test('B3491 aperçu enregistré, versions et rendu GED restent inchangés',()=>{
  assert.match(settings,/PrivateImage path=\{`\/document-marks\/stamps/);assert.match(settings,/Nouvelle version/);assert.match(ged,/Déposer un fichier/);assert.match(ged,/PDF, PNG ou JPEG — maximum 15 Mo/);assert.match(ged,/rejectInvalid=false/);
});

test('B3491 responsive et accessibilité sont assurés par les conventions GED',()=>{
  for(const token of['role="button"','tabIndex=','onKeyDown','onDragEnter','onDragOver','onDrop={drop}','min-w-0','truncate','flex justify-end gap-2'])assert.match(ged,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});
