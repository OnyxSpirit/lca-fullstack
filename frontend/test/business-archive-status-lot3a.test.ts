import assert from'node:assert/strict';
import test from'node:test';
import{businessArchiveStatusLabel}from'../src/services/businessArchiveStatus';

test('LOT3A présente chaque diagnostic documentaire sans détail infrastructure',()=>{
  assert.equal(businessArchiveStatusLabel('AVAILABLE'),'Archive disponible');
  assert.equal(businessArchiveStatusLabel('MISSING_RECORD'),'Archive absente');
  assert.equal(businessArchiveStatusLabel('FILE_MISSING'),'Fichier de l’archive indisponible');
  assert.equal(businessArchiveStatusLabel('INTEGRITY_ERROR'),'Intégrité de l’archive invalide');
  assert.equal(businessArchiveStatusLabel('STORAGE_UNAVAILABLE'),'Stockage documentaire temporairement inaccessible');
  assert.equal(businessArchiveStatusLabel('HISTORICAL_ONLY'),'Archive historique uniquement');
});
