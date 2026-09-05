import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { HttpError } from '../src/shared/http-error.js';
import { assertSaleTransition, saleTotals, validateCreateSale } from '../src/modules/sales/sale.domain.js';

const errorStatus=(work:()=>unknown)=>{try{work();return 0}catch(error){assert.ok(error instanceof HttpError);return error.status}};
test('Sales accepte un payload minimal sans données de démonstration',()=>{const value=validateCreateSale({customerId:'1',vehicleId:'2',agencyId:'3',salespersonId:'4',discount:0,depositAmount:0,notes:'',idempotencyKey:'sale-test-0001'});assert.equal(value.discount,0);assert.equal(value.depositAmount,0);assert.equal(value.notes,null)});
test('Sales exige client, véhicule et clé idempotente',()=>{assert.equal(errorStatus(()=>validateCreateSale({vehicleId:'2',idempotencyKey:'sale-test'})),400);assert.equal(errorStatus(()=>validateCreateSale({customerId:'1',vehicleId:'2'})),400)});
test('Sales refuse les montants non finis ou négatifs',()=>{assert.equal(errorStatus(()=>validateCreateSale({customerId:'1',vehicleId:'2',discount:-1,idempotencyKey:'sale-test'})),400);assert.equal(errorStatus(()=>saleTotals(100,Number.NaN,0)),400)});
test('Sales calcule le total depuis le prix backend',()=>{assert.deepEqual(saleTotals(10_000,1_500,2_000),{subtotal:10_000,discount:1_500,total:8_500,depositAmount:2_000,balanceDue:6_500})});
test('Sales refuse remise et acompte supérieurs au total',()=>{assert.equal(errorStatus(()=>saleTotals(100,101,0)),400);assert.equal(errorStatus(()=>saleTotals(100,10,91)),400)});
test('Sales autorise uniquement la prochaine transition métier',()=>{assert.equal(assertSaleTransition('reserved','ordered'),'ordered');assert.equal(assertSaleTransition('preparation','ready_for_delivery'),'ready_for_delivery');assert.equal(errorStatus(()=>assertSaleTransition('delivered','draft')),409);assert.equal(errorStatus(()=>assertSaleTransition('cancelled','delivered')),409)});
test('Sales verrouille les agrégats et protège le double traitement',()=>{const source=readFileSync(new URL('../src/modules/sales/sale.service.ts',import.meta.url),'utf8');assert.match(source,/idempotency_key=\?/);assert.match(source,/FOR UPDATE/);assert.match(source,/status!='available'|status!==\'available\'/);assert.match(source,/UPDATE vehicles SET status='reserved'/);assert.match(source,/UPDATE reservations SET status='cancelled'/);assert.match(source,/sale\.created/);assert.match(source,/sale\.cancelled/)});
test('la migration Sales conserve les historiques et ajoute une unicité idempotente',()=>{const sql=readFileSync(new URL('../database/migrations/001_sales_stabilization.sql',import.meta.url),'utf8');assert.match(sql,/UNIQUE KEY uk_sales_idempotency/);assert.match(sql,/created_by/);assert.match(sql,/cancellation_reason/);assert.doesNotMatch(sql,/DELETE FROM sales|DROP TABLE sales/i)});
