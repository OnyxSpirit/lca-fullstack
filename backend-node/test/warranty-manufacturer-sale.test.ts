import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const manufacturers=read('../src/modules/settings/manufacturer.service.ts');
const settingsRoutes=read('../src/modules/settings/setting.routes.ts');
const warranty=read('../src/modules/sales/vehicle-warranty.service.ts');
const saleDomain=read('../src/modules/sales/sale.domain.ts');
const sales=read('../src/modules/sales/sale.service.ts');
const delivery=read('../src/modules/deliveries/delivery.routes.ts');

test('WARRANTY-MFR-01 constructeur sans marque associée rend la garantie indisponible',()=>{
  assert.match(warranty,/LEFT JOIN warranty_providers wp ON wp\.id=b\.warranty_provider_id/);
  assert.match(warranty,/vehicle\.provider_id\?\{applicable:true/);
});

test('WARRANTY-MFR-02 la marque associée détermine le constructeur disponible',()=>{
  assert.match(warranty,/vehicles v JOIN versions ve ON ve\.id=v\.version_id JOIN models m ON m\.id=ve\.model_id JOIN brands b ON b\.id=m\.brand_id/);
  assert.match(manufacturers,/UPDATE brands SET warranty_provider_id=\? WHERE id IN/);
});

test('WARRANTY-MFR-03 un même nom sans FK ne crée aucune association implicite',()=>{
  assert.doesNotMatch(warranty,/wp\.name\s*=\s*b\.name|LOWER\([^)]*wp\.name[^)]*\)\s*=|LIKE\s+b\.name/i);
  assert.doesNotMatch(manufacturers,/wp\.name\s*=\s*b\.name|LOWER\([^)]*name[^)]*\)\s*=/i);
});

test('WARRANTY-MFR-04 warranty_available=false exclut les nouvelles garanties',()=>{
  assert.match(warranty,/wp\.is_active=TRUE AND wp\.warranty_available=TRUE/);
});

test('WARRANTY-MFR-05 un constructeur désactivé est exclu sans altérer les snapshots',()=>{
  assert.match(manufacturers,/UPDATE warranty_providers SET is_active=\?/);
  assert.match(warranty,/wp\.is_active=TRUE AND wp\.warranty_available=TRUE/);
  assert.doesNotMatch(manufacturers,/DELETE FROM warranty_providers|UPDATE vehicle_warranty_contracts/);
});

test('WARRANTY-MFR-06 les valeurs par défaut sont récupérées par la proposition',()=>{
  assert.match(warranty,/wp\.default_warranty_months duration_months,wp\.default_mileage_limit mileage_limit/);
  assert.match(warranty,/durationMonths:Number\(vehicle\.duration_months\)/);
});

test('WARRANTY-MFR-07 le véhicule reste isolé par sa chaîne version-modèle-marque',()=>{
  assert.match(warranty,/WHERE v\.id=\?/);
  assert.doesNotMatch(warranty,/SELECT[^;]*FROM brands[^;]*LIMIT 1/i);
});

test('WARRANTY-MFR-08 le backend refuse une garantie applicable forgée sans FK valide',()=>{
  assert.doesNotMatch(saleDomain,/providerId/);
  assert.match(warranty,/JOIN warranty_providers wp ON wp\.id=b\.warranty_provider_id WHERE v\.id=\? AND wp\.is_active=TRUE AND wp\.warranty_available=TRUE FOR UPDATE/);
  assert.match(warranty,/if\(!provider\)throw new HttpError\(409/);
});

test('WARRANTY-MFR-09 les permissions Constructeurs restent granulaires',()=>{
  for(const permission of ['settings.manufacturers.view','settings.manufacturers.create','settings.manufacturers.update','settings.manufacturers.disable'])assert.match(settingsRoutes,new RegExp(`requirePermission\\('${permission.replaceAll('.','\\.')}'\\)`));
});

test('WARRANTY-MFR-10 le contrat est créé avec la vente puis activé à la livraison',()=>{
  assert.match(sales,/createSnapshot\(connection/);
  assert.match(warranty,/status='PENDING_ACTIVATION'/);
  assert.match(delivery,/await activateAtDelivery\(connection/);
  assert.match(warranty,/UPDATE vehicle_warranty_contracts SET status='ACTIVE'/);
});
