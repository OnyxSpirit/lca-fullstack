import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const catalog=fs.readFileSync(new URL('../src/modules/vehicles/commercial-catalog.routes.ts',import.meta.url),'utf8');
const vehicles=fs.readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');
const quotations=fs.readFileSync(new URL('../src/modules/quotations/quotation.routes.ts',import.meta.url),'utf8');
const proformas=fs.readFileSync(new URL('../src/modules/proformas/proforma.routes.ts',import.meta.url),'utf8');
const pdf=fs.readFileSync(new URL('../src/modules/documents/commercial-document.ts',import.meta.url),'utf8');
const migration=fs.readFileSync(new URL('../database/migrations/134_vehicle_orders_and_demo_status.sql',import.meta.url),'utf8');

test('EVO-01/02 bloque les nouveaux devis et conserve la pro forma directe',()=>{assert.match(quotations,/post\('\/quotations'[\s\S]+HttpError\(410/);assert.match(proformas,/post\('\/proformas'/);assert.match(proformas,/get\('\/proformas\/config'/)});
test('EVO-04..09 commandes quantitatives, fiches sans VIN, réception et pagination',()=>{assert.match(catalog,/post\('\/vehicle-orders'/);assert.match(catalog,/vehicle_type,vin,status[\s\S]+NULL,'ordered'/);assert.match(catalog,/FOR UPDATE/);assert.match(catalog,/status='received'/);assert.match(catalog,/standardPageRequest/);assert.match(migration,/vehicle_order_id/);assert.match(migration,/CHECK \(quantity_ordered > 0\)/)});
test('EVO-10 ajoute Démonstration sans le compter disponible',()=>{assert.match(vehicles,/ADMINISTRABLE_VEHICLE_STATUSES=\[[^\]]+'demo'/);assert.match(migration,/available','demo','reserved/);assert.match(vehicles,/SUM\(v\.status='available'\) available,SUM\(v\.status='demo'\) demo/)});
test('EVO-11 omet réellement le prédicat statut pour Tous les statuts',()=>{assert.match(proformas,/if\(status\)\{where\.push\('p\.status=\?'/);assert.match(proformas,/allowedStatuses/)});
test('EVO-12/13 toutes les photos pour une fiche, une représentative par véhicule distinct',()=>{assert.match(pdf,/multipleDistinct=new Set\(keys\)\.size>1/);assert.match(pdf,/multipleDistinct\?storedImages\.slice\(0,1\):storedImages/);assert.match(pdf,/seen\.has\(key\)/)});
