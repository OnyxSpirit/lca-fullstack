import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';

const page=readFileSync(new URL('../src/modules/sales/SaleDetailPage.tsx',import.meta.url),'utf8');

test('SALE-CANCEL-01/03 masque Créer la facture même avec la permission',()=>{
  assert.match(page,/!sale\.invoiceId&&canCreateInvoice&&sale\.status!==['"]ANNULE['"]/);
});

test('SALE-CANCEL-02/03 masque le planning opérationnel même avec la permission',()=>{
  assert.match(page,/canViewDelivery&&sale\.status!==['"]ANNULE['"]/);
});

test('SALE-CANCEL-07/08 conserve les permissions et conditions historiques des ventes actives',()=>{
  assert.match(page,/!sale\.invoiceId&&canCreateInvoice&&sale\.status!==['"]ANNULE['"]/);
  assert.match(page,/sale\.status === ['"]PRET_LIVRAISON['"]&&canPlanDelivery/);
  assert.match(page,/sale\.invoiceId&&canViewInvoice/);
});

