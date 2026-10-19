import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const routes=readFileSync(new URL('../src/modules/hr/hr-provider-contract.routes.ts',import.meta.url),'utf8');

test('LOT4.1 PATCH reste protégé par permission, scope et verrou transactionnel',()=>{assert.match(routes,/patch\('\/hr\/provider-contracts\/:id',requirePermission\('hr\.provider\.contract\.manage'\)/);assert.match(routes,/contract\(r,'hr\.provider\.contract\.manage',contractId,c,true\)/);assert.match(routes,/FOR UPDATE/)});
test('LOT4.1 le backend interdit les états non brouillon et valide les détails',()=>{assert.match(routes,/current\.status!=='DRAFT'/);assert.match(routes,/Seul un contrat brouillon peut être modifié/);assert.match(routes,/installments\(b\.installments/);assert.match(routes,/requirements\(b\.requirements\)/);assert.match(routes,/replaceDetails/)});
