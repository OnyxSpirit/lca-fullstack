import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{vehicleOrderSql,vehiclePriceRange}from'../src/modules/vehicles/vehicle.routes.js';

const migration=readFileSync(new URL('../database/migrations/127_crm_customer_stock_closure.sql',import.meta.url),'utf8');
const customers=readFileSync(new URL('../src/modules/customers/customer.routes.ts',import.meta.url),'utf8');
const crm=readFileSync(new URL('../src/modules/crm/crm.routes.ts',import.meta.url),'utf8');
const vehicles=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');

test('migration 127 est additive et conserve les références historiques',()=>{assert.match(migration,/CREATE TABLE customer_contact_history/);assert.match(migration,/CREATE TABLE vehicle_interagency_transfers/);assert.match(migration,/archived_at/);assert.doesNotMatch(migration,/\bDROP\b|DELETE FROM/)});
test('contacts utilisent désactivation, réactivation et historique sans suppression physique',()=>{assert.match(customers,/contacts\/:contactId\/deactivate/);assert.match(customers,/contacts\/:contactId\/reactivate/);assert.match(customers,/customer_contact_history/);assert.doesNotMatch(customers,/DELETE FROM customer_contacts/)});
test('prospects archivés sont exclus par défaut et gardent les doublons',()=>{assert.match(crm,/archive==='active'\?'l\.archived_at IS NULL'/);assert.match(crm,/leads\/:id\/archive/);assert.match(crm,/leads\/:id\/reactivate/);assert.match(crm,/Le prospect est archivé/)});
test('plage de prix valide les bornes XAF',()=>{assert.deepEqual(vehiclePriceRange('',undefined),{minPrice:null,maxPrice:null});assert.deepEqual(vehiclePriceRange('100.126','200'),{minPrice:100.13,maxPrice:200});assert.throws(()=>vehiclePriceRange(-1,2));assert.throws(()=>vehiclePriceRange(3,2))});
test('tri véhicule est une liste blanche stable',()=>{for(const key of['date_desc','date_asc','brand','model','price_asc','price_desc'])assert.match(vehicleOrderSql(key),/v\.id/);assert.throws(()=>vehicleOrderSql('sale_price; DROP TABLE vehicles'))});
test('transfert inter-agences sépare initiation, expédition, réception et annulation',()=>{for(const path of['interagency-transfers','dispatch','receive','cancel'])assert.match(vehicles,new RegExp(path));assert.match(vehicles,/PENDING_SHIPMENT/);assert.match(vehicles,/RETURN_REQUIRED/);assert.match(vehicles,/FOR UPDATE/);assert.match(vehicles,/Permission destination insuffisante/)});
