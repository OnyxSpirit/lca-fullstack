import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{warrantyDraftForProvider}from'../src/modules/vehicles/TechnicalCharacteristicsForm';

test('la sélection constructeur recopie exactement la configuration admissible',()=>{
 const draft=warrantyDraftForProvider({id:'7',code:'TOY',name:'Toyota',durationMonths:36,mileageLimit:100000,terms:'Garantie constructeur : 36 mois ou 100 000 km'});
 assert.deepEqual(draft,{hasWarranty:true,providerId:'7',providerCode:'TOY',providerName:'Toyota',durationMonths:36,mileageLimit:100000,terms:'Garantie constructeur : 36 mois ou 100 000 km'});
});

test('les caractéristiques personnalisées restent dans la largeur de la modale',()=>{
 const source=readFileSync(new URL('../src/modules/vehicles/TechnicalCharacteristicsForm.tsx',import.meta.url),'utf8');
 assert.match(source,/grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4/);
 assert.match(source,/w-full min-w-0 rounded border/);
 assert.doesNotMatch(source,/sm:grid-cols-\[1\.2fr_1fr_\.6fr_1fr_auto\]/);
});

test('le formulaire de modification ne rafraîchit pas le snapshot à la simple ouverture',()=>{
 const source=readFileSync(new URL('../src/modules/vehicles/EditVehicleModal.tsx',import.meta.url),'utf8');
 assert.match(source,/warrantyDirty\?\{warrantyAssignment:warranty\}:\{\}/);
 assert.match(source,/setWarrantyDirty\(false\)/);
});
