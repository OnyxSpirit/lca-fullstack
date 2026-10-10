import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{stockItemCreationPayload,stockUnitError}from'../src/modules/hr/stockItemValidation';

const page=readFileSync(new URL('../src/modules/hr/HrAdministrationPage.tsx',import.meta.url),'utf8');

test('RH-STOCK-UX-02 clarifie l unité de mesure sans la convertir en nombre',()=>{
  assert.match(page,/Unité de mesure<input name="unit" required maxLength=\{40\}/);
  assert.match(page,/placeholder="Ex\. : pièce, rame, carton"/);
  assert.equal(stockUnitError('pièce'),null);assert.equal(stockUnitError('rame'),null);assert.equal(stockUnitError('pack de 10'),null);
  assert.match(stockUnitError('10')??'',/unité de mesure/);
});

test('RH-STOCK-UX-02 laisse le seuil vide, conserve zéro explicite et les décimales',()=>{
  assert.match(page,/name="minimumQuantity" type="number" min="0" step="0\.001" placeholder="Saisir le seuil minimum"/);
  assert.doesNotMatch(page,/name="minimumQuantity"[^>]*defaultValue="0"/);
  const empty=stockItemCreationPayload([['unit','rame'],['minimumQuantity','']]);assert.equal(Object.hasOwn(empty,'minimumQuantity'),false);
  assert.equal(stockItemCreationPayload([['unit','rame'],['minimumQuantity','0']]).minimumQuantity,'0');
  assert.equal(stockItemCreationPayload([['unit','rame'],['minimumQuantity','2.5']]).minimumQuantity,'2.5');
});

test('RH-STOCK-UX-02 bloque avant API une unité purement numérique',()=>{
  assert.throws(()=>stockItemCreationPayload([['unit','25']]),/unité de mesure/);
});
