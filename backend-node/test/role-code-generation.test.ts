import assert from'node:assert/strict';import test from'node:test';
import{roleCodeBase,roleCodeCandidate}from'../src/modules/users/role-code.js';

test('ROLE-CODE-01 normalise accents, espaces et caractères spéciaux',()=>{
 assert.equal(roleCodeBase("Chef d'atelier"),'CHEF_D_ATELIER');
 assert.equal(roleCodeBase('Responsable SAV'),'RESPONSABLE_SAV');
 assert.equal(roleCodeBase('  Comptable principal  '),'COMPTABLE_PRINCIPAL');
 assert.equal(roleCodeBase('Équipe pièces & stock'),'EQUIPE_PIECES_STOCK');
});
test('ROLE-CODE-02 produit des collisions déterministes et bornées',()=>{
 const base=roleCodeBase('Responsable SAV');assert.equal(roleCodeCandidate(base,1),'RESPONSABLE_SAV');assert.equal(roleCodeCandidate(base,2),'RESPONSABLE_SAV_2');assert.equal(roleCodeCandidate(base,27),'RESPONSABLE_SAV_27');
 const long=roleCodeBase('Responsable '.repeat(20));assert.ok(long.length<=78);assert.ok(roleCodeCandidate(long,999).length<=78);
});
test('ROLE-CODE-03 conserve un préfixe alphabétique valide',()=>{
 assert.equal(roleCodeBase('123 !!!'),'ROLE');assert.equal(roleCodeBase('123 atelier'),'ATELIER');
});
