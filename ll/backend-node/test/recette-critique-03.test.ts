import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

test('SALE-CANCEL-04/06/12 la facturation directe refuse toujours cancelled',()=>{
  const billing=read('../src/modules/billing/billing.routes.ts');
  assert.match(billing,/SELECT id,customer_id,agency_id,status,total,tax_mode,price_input_mode,tax_rate_snapshot,currency_code FROM sales WHERE id=\? FOR UPDATE/);
  assert.match(billing,/sales\[0\]\.status===['"]cancelled['"]/);
  assert.match(billing,/Une vente annulée ne peut pas être facturée/);
});

test('SALE-CANCEL-05/06/12 création et poursuite livraison refusent cancelled',()=>{
  const delivery=read('../src/modules/deliveries/delivery.routes.ts');
  assert.match(delivery,/lockedSale\.status!==['"]ready_for_delivery['"]/);
  assert.match(delivery,/deliveryRouter\.use\(['"]\/deliveries\/:id['"]/);
  assert.match(delivery,/JOIN sales s ON s\.id=d\.sale_id/);
  assert.match(delivery,/sale\?\.status===['"]cancelled['"]/);
  assert.match(delivery,/vente annulée est terminale/);
});

test('SALE-CANCEL-09/10 conserve les historiques et autorise uniquement leur consultation',()=>{
  const billing=read('../src/modules/billing/billing.routes.ts'),delivery=read('../src/modules/deliveries/delivery.routes.ts');
  assert.doesNotMatch(billing,/DELETE FROM invoices WHERE sale_id/);
  assert.doesNotMatch(delivery,/DELETE FROM deliveries WHERE sale_id/);
  assert.match(delivery,/if\(!\['POST','PATCH','PUT','DELETE'\]\.includes\(request\.method\)/);
});

