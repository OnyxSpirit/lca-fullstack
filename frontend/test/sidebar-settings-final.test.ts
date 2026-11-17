import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const sidebar=read('../src/components/layout/Sidebar.tsx'),settings=read('../src/modules/settings/SettingsPage.tsx');

test('NAV-FINAL-01 conserve Paramètres Concession sans entrée Agences autonome',()=>{
 assert.match(sidebar,/label: 'Paramètres Concession'/);
 assert.doesNotMatch(sidebar,/label: 'Agences'/);
 assert.doesNotMatch(sidebar,/settings\}\?tab=agencies/);
 assert.match(settings,/agencies:`Agences/);
});

test('SET-FINAL-01 le conteneur et la barre d’onglets peuvent rétrécir sur mobile',()=>{
 assert.match(settings,/min-w-0 max-w-full space-y-6/);
 assert.match(settings,/w-full min-w-0 max-w-full gap-1 overflow-x-auto/);
});
