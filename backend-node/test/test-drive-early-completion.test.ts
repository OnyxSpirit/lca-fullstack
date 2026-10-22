import assert from'node:assert/strict';
import test from'node:test';
import{assertTestDriveReturnAllowed}from'../src/modules/showroom/showroom-test-drive.ts';

const active={status:'in_progress',mileage_out:12_500};

for(const elapsedMinutes of[5,12,30,45]){
  test(`la clôture est autorisée après ${elapsedMinutes} minutes sans durée minimale`,()=>{
    assert.doesNotThrow(()=>assertTestDriveReturnAllowed(active,12_510));
  });
}

test('un essai planned ne peut pas être clôturé',()=>{
  assert.throws(()=>assertTestDriveReturnAllowed({...active,status:'planned'},12_510),error=>Boolean(error&&typeof error==='object'&&'status'in error&&(error as any).status===409));
});

test('une deuxième clôture est refusée',()=>{
  assert.throws(()=>assertTestDriveReturnAllowed({...active,status:'completed'},12_510),/retour déjà enregistré/);
});

test('le kilométrage de retour doit être entier et supérieur ou égal au départ',()=>{
  assert.throws(()=>assertTestDriveReturnAllowed(active,12_499),/Kilométrage de retour invalide/);
  assert.throws(()=>assertTestDriveReturnAllowed(active,12_500.5),/Kilométrage de retour invalide/);
  assert.doesNotThrow(()=>assertTestDriveReturnAllowed(active,12_500));
});
