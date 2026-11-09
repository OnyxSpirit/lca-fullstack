import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const routes=read('../src/modules/workshop/sav-operations.routes.ts');
const historicalMigration=read('../database/migrations/111_sav_operations_finance.sql');
const integrationMigration=read('../database/migrations/112_sav_transit_treasury_integration.sql');

test('la caisse SAV ventile les fonds confirmés par moyen de paiement',()=>{
 assert.match(routes,/GROUP BY i\.agency_id,pm\.id,pm\.code,pm\.name/);
 assert.match(routes,/p\.status='confirmed'/);
 assert.match(routes,/payment_refunds/);
 assert.match(routes,/st\.payment_method_id/);
});

test('la destination provient du mapping Treasury actif et reste revalidée à la confirmation',()=>{
 assert.match(routes,/treasury_account_mappings/);
 assert.match(routes,/m\.payment_method_id=\?/);
 assert.match(routes,/m\.treasury_account_id=\?/);
 assert.match(routes,/La destination n’est plus compatible/);
 assert.match(routes,/ta\.is_active=TRUE/);
});

test('la transmission ne crée pas un second paiement ni un second mouvement Treasury',()=>{
 assert.doesNotMatch(routes,/INSERT INTO payments/);
 assert.doesNotMatch(routes,/INSERT INTO treasury_movements/);
 assert.doesNotMatch(routes,/postAutomaticMovement|postMovement/);
});

test('la migration additive conserve historique, idempotence et distinction physique/rapprochement',()=>{
 for(const token of['payment_method_id','destination_account_id','PHYSICAL_TRANSFER','ACCOUNTING_RECONCILIATION'])assert.match(integrationMigration,new RegExp(token));
 for(const token of['uq_sav_transit_key','EN_ATTENTE_RECEPTION'])assert.match(historicalMigration,new RegExp(token));
 assert.doesNotMatch(integrationMigration,/DROP\s+(TABLE|COLUMN)/i);
 assert.doesNotMatch(historicalMigration,/payment_method_id|destination_account_id|operation_kind/);
});
