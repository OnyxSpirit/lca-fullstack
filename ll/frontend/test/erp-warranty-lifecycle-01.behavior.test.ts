import assert from'node:assert/strict';import{readFileSync}from'node:fs';import test from'node:test';
const page=readFileSync(new URL('../src/modules/settings/ManufacturersSettings.tsx',import.meta.url),'utf8'),settings=readFileSync(new URL('../src/modules/settings/SettingsPage.tsx',import.meta.url),'utf8'),hooks=readFileSync(new URL('../src/api/settingHooks.ts',import.meta.url),'utf8');
test('WL01-FE-A Paramètres expose Constructeurs',()=>{assert.match(settings,/manufacturers:'Constructeurs'/);assert.match(settings,/ManufacturersSettings/)});
test('WL01-FE-B création et modification utilisent le référentiel API',()=>{assert.match(page,/actions\.create/);assert.match(page,/actions\.update/);assert.match(hooks,/\/settings\/manufacturers/)});
test('WL01-FE-C activation et désactivation sans suppression',()=>{assert.match(page,/Désactiver/);assert.match(page,/Réactiver/);assert.match(page,/données existantes seront conservées/);assert.doesNotMatch(page,/>Supprimer</)});
test('WL01-FE-D defaults durée et kilométrage sont éditables',()=>{assert.match(page,/Durée par défaut \(mois\)/);assert.match(page,/Limite kilométrique par défaut/)});
test('WL01-FE-E marques sont rattachables séparément',()=>assert.match(page,/Marques rattachées/));
test('WL01-FE-F actions suivent les permissions granulaires',()=>{for(const permission of['settings.manufacturers.view','settings.manufacturers.create','settings.manufacturers.update','settings.manufacturers.disable'])assert.match(settings,new RegExp(permission))});
