import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const source=readFileSync(new URL('../src/modules/billing/billing.routes.ts',import.meta.url),'utf8');
const creation=source.slice(source.indexOf("post('/invoices'"),source.indexOf("patch('/invoices/:id'"));

test('LOCK-16 rejette un client incompatible avec la vente',()=>{
  assert.match(creation,/String\(sales\[0\]\.customer_id\)!==customer/);
  assert.match(creation,/Vente incompatible avec le client ou l’agence/);
});

test('LOCK-17 impose une ligne de quantité 1',()=>{
  assert.match(creation,/items\.length!==1\|\|items\[0\]\?\.quantity!==1/);
});

test('LOCK-18/19 neutralise prix et remise forgés avec la ligne autoritative de vente',()=>{
  assert.match(creation,/SELECT vehicle_id,description,unit_price,discount FROM sale_items/);
  assert.match(creation,/unitPrice:Number\(saleItem\.unit_price\)\*factor/);
  assert.match(creation,/discount:Number\(saleItem\.discount\)\*factor/);
  assert.ok(creation.indexOf('items=lines(r.body.items,taxMode,priceInputMode,taxRate)')<creation.indexOf('items=lines([{vehicleId:saleItem.vehicle_id'));
});

test('LOCK-20 conserve le snapshot fiscal et vérifie le total de la vente',()=>{
  assert.match(creation,/taxMode=sales\[0\]\.tax_mode;priceInputMode=sales\[0\]\.price_input_mode;taxRate=Number\(sales\[0\]\.tax_rate_snapshot\)/);
  assert.match(creation,/Math\.abs\(Number\(sales\[0\]\.total\)-sum\.total\)>\.01/);
});

test('LOCK-21/22 limite les nouvelles protections aux factures rattachées à une vente',()=>{
  assert.match(creation,/if\(sale&&type!==['"]vehicle['"]\)/);
  assert.match(creation,/if\(sale\)\{const\[sales\]/);
  assert.match(creation,/if\(!sale&&\(taxMode/);
});
