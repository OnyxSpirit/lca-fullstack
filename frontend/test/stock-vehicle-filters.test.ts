import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const page=readFileSync(new URL('../src/modules/vehicles/VehiclesListPage.tsx',import.meta.url),'utf8');
const hooks=readFileSync(new URL('../src/api/erpHooks.ts',import.meta.url),'utf8');
const bootstrap=readFileSync(new URL('../src/components/AppBootstrap.tsx',import.meta.url),'utf8');

test('STOCK-FILTER-02/03 Marque et Modèle utilisent les options accessibles du backend',()=>{
  assert.match(page,/useVehicleFilterOptionsQuery/);
  assert.match(page,/Toutes marques/);assert.match(page,/Tous modèles/);
  assert.match(page,/setSelectedBrand\(e\.target\.value\);setSelectedModel\('ALL'\)/);
  assert.match(hooks,/\/vehicles\/filter-options/);
});
test('STOCK-FILTER-04 les nouveaux filtres participent au contrat, à la requête et au queryKey',()=>{
  assert.match(hooks,/brandId\?: string/);assert.match(hooks,/modelId\?: string/);
  assert.match(hooks,/queryKey: \[\.\.\.erpKeys\.vehicles, filters\]/);
  assert.match(page,/brandId:selectedBrand/);assert.match(page,/modelId:selectedModel/);
});
test('STOCK-FILTER-06 le reset rétablit Marque et Modèle à Tous',()=>{
  assert.match(page,/resetFilters=.*setSelectedBrand\('ALL'\);setSelectedModel\('ALL'\)/);
  assert.match(page,/>Réinitialiser</);
});
test('STOCK-FILTER-07 le compteur utilise le total serveur et non la taille de la page',()=>{
  assert.match(hooks,/interface VehicleListResult[\s\S]*total: number/);
  assert.match(page,/filteredTotal=vehiclesQuery\.data\?\.total/);
  assert.doesNotMatch(page,/filteredTotal=vehicles\.length/);
});
test('STOCK-KPI-05 le KPI vient de MySQL et reste correct après rechargement',()=>{
  assert.match(page,/stats\?\.availableForSale/);
  assert.doesNotMatch(page,/vehicles\.filter[\s\S]*availableCount/);
  assert.match(page,/véhicule\{availableCount===1\?'':'s'\} disponible/);
  assert.doesNotMatch(page,/stats\?\.total/);
  assert.doesNotMatch(page,/\/ \{stats\?\.total/);
});
test('la vente invalide liste, total, options et KPI en mutation locale et realtime',()=>{
  assert.match(hooks,/useSaleStatusMutation[\s\S]*invalidateQueries\(\{queryKey:erpKeys\.vehicles\}\)/);
  assert.match(bootstrap,/event==='sales:created'\|\|event==='sales:status'[\s\S]*erpKeys\.vehicles/);
});
