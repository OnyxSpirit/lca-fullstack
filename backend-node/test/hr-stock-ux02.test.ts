import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{stockUnit}from'../src/modules/hr/hr-stock-validation';

test('RH-STOCK-UX-02 valide les unités textuelles et refuse les payloads numériques forgés',()=>{
  for(const value of['pièce','rame','carton','boîte','kg','litre','m²','pack de 10'])assert.equal(stockUnit(value),value);
  for(const value of['10','25','100',' 10 ','10.5'])assert.throws(()=>stockUnit(value),(error:any)=>error.status===400);
});

test('RH-STOCK-UX-02 conserve les validations obligatoires et la borne de 40 caractères',()=>{
  assert.throws(()=>stockUnit(''),(error:any)=>error.status===400);
  assert.throws(()=>stockUnit('x'.repeat(41)),(error:any)=>error.status===400);
});

test('RH-STOCK-UX-02 branche la validation sur l endpoint et conserve le contrat décimal',()=>{
  const routes=readFileSync(new URL('../src/modules/hr/hr.routes.ts',import.meta.url),'utf8');
  assert.match(routes,/unit=stockUnit\(b\.unit\)/);
  assert.match(routes,/minimum=stockThreshold\(b\.minimumQuantity\?\?0\)/);
  assert.match(routes,/const stockThreshold=.*nonNegative/);
  assert.doesNotMatch(routes,/Math\.(?:round|floor|ceil)\([^)]*minimumQuantity/);
});
