import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const root=new URL('../',import.meta.url);
const migration=await readFile(new URL('database/migrations/106_sav_parts_internal_logistics.sql',root),'utf8');
const workshop=await readFile(new URL('src/modules/workshop/workshop.routes.ts',root),'utf8');
const supplierFinance=await readFile(new URL('src/modules/parts/supplier-finance.routes.ts',root),'utf8');

test('SAV-PARTS-01 la demande interne est unique par acceptation',()=>{
  assert.match(migration,/UNIQUE KEY uq_sav_part_request_approval\(accepted_approval_id\)/);
  assert.match(workshop,/INSERT INTO sav_part_requests/);
  assert.match(workshop,/partItems\.length/);
});

test('SAV-PARTS-02 les quantités logistiques sont bornées dans l’ordre métier',()=>{
  assert.match(migration,/quantity_delivered<=quantity_prepared/);
  assert.match(migration,/quantity_received<=quantity_delivered/);
  assert.match(migration,/quantity_consumed\+quantity_returned<=quantity_received/);
});

test('SAV-PARTS-03 livraison, réception et retour sont rejouables sans doublon',()=>{
  assert.match(migration,/uq_sav_delivery_request_key/);
  assert.match(migration,/uq_sav_receipt_delivery_key/);
  assert.match(migration,/uq_sav_return_delivery_key/);
});

test('SAV-PARTS-04 les permissions remplacent la séparation de personnes codée en dur',()=>{
  assert.match(supplierFinance,/créateur ne peut pas valider/i);
  assert.match(supplierFinance,/supplier\.invoice\.validate/);
  assert.match(migration,/service\.order\.handover_unpaid/);
  assert.match(workshop,/assertPermission\(r,'service\.order\.handover_unpaid'\)/);
});

test('SAV-PARTS-05 la remise clôt automatiquement l’OR',()=>{
  assert.match(workshop,/SET status='closed',closed_at=NOW\(\)/);
  assert.match(workshop,/Remise physique et clôture automatique/);
});
