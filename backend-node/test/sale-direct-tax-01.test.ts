import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {validateCreateSale} from '../src/modules/sales/sale.domain.js';
import {calculateTaxLine} from '../src/shared/tax-calculation.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const service=read('../src/modules/sales/sale.service.ts');
const billing=read('../src/modules/billing/billing.routes.ts');
const domain=read('../src/modules/sales/sale.domain.ts');

const payload={customerId:'1',vehicleId:'2',agencyId:'3',discount:0,depositAmount:0,idempotencyKey:'direct-tax-001'};

test('SALE-TAX-01/02/05/06 accepte les deux régimes et modes existants',()=>{
  assert.equal(validateCreateSale({...payload,taxMode:'TAXABLE',priceInputMode:'HT'}).taxMode,'TAXABLE');
  assert.equal(validateCreateSale({...payload,taxMode:'TAX_EXEMPT',priceInputMode:'TTC'}).taxMode,'TAX_EXEMPT');
  assert.equal(validateCreateSale({...payload,taxMode:'TAXABLE',priceInputMode:'TTC'}).priceInputMode,'TTC');
  assert.throws(()=>validateCreateSale({...payload,taxMode:'OTHER'}),/Régime fiscal/);
});

test('SALE-TAX-03/04 utilise le taux configuré et le contrat fiscal commun',()=>{
  assert.match(service,/getEffectiveBusinessSettings\(agencyId\)/);
  assert.match(service,/taxRate:businessConfig\.vatRate/);
  const exempt=calculateTaxLine({quantity:1,unitPrice:10_000,discount:0,taxMode:'TAX_EXEMPT',priceInputMode:'HT',taxRate:18.9});
  assert.equal(exempt.taxRate,0);assert.equal(exempt.tax,0);
});

test('SALE-TAX-07/08 préserve strictement le snapshot du devis',()=>{
  assert.match(service,/quotation\?\.tax_mode\?\?directTax!\.taxMode/);
  assert.match(service,/quotation\?\.price_input_mode\?\?directTax!\.priceInputMode/);
  assert.match(service,/quotation\?\.tax_rate_snapshot\?\?directTax!\.taxRate/);
  assert.match(service,/quotation\?\.currency_code\?\?businessConfig\.currencyCode/);
});

test('SALE-TAX-09/10 protège les dérogations directes par sales.tax.override',()=>{
  assert.match(service,/!input\.quotationId&&\(input\.taxMode!==['"]TAXABLE['"]\|\|input\.priceInputMode!==['"]HT['"]\).*assertPermission\(request,['"]sales\.tax\.override['"]\)/);
});

test('SALE-TAX-11 conserve les verrous marge et minimum',()=>{
  assert.match(service,/assertVehicleMargin\(vehicle,quotation\?effectiveSubtotal-effectiveDiscount:directTax!\.netHt\)/);
  assert.match(service,/assertVehicleMinimumPrice\(vehicle,effectiveSubtotal-effectiveDiscount\)/);
});

test('SALE-TAX-12 conserve la machine de statuts Vente',()=>{
  assert.match(domain,/reserved: \['ordered','cancelled'\], ordered: \['confirmed','cancelled'\]/);
  assert.match(domain,/confirmed: \['preparation','cancelled'\]/);
});

test('INVOICE-VEH-05/06/07/08 la facture relit le snapshot fiscal de la vente',()=>{
  assert.match(billing,/taxMode=sales\[0\]\.tax_mode;priceInputMode=sales\[0\]\.price_input_mode;taxRate=Number\(sales\[0\]\.tax_rate_snapshot\)/);
});

test('INVOICE-VEH-01/09 impose quantity 1 seulement aux factures liées à une vente',()=>{
  assert.match(billing,/if\(items\.length!==1\|\|items\[0\]\?\.quantity!==1\)throw new HttpError\(409/);
  assert.doesNotMatch(billing,/function lines[\s\S]*quantity:1/);
});
