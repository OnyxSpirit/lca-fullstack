import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const source=readFileSync(new URL('../src/modules/customers/customer.routes.ts',import.meta.url),'utf8');

test('CRUD et contacts clients utilisent OWN/AGENCY sans agence client fiable',()=>{
 assert.equal((source.match(/requireAgencyBusinessPermission\('customers\.(?:view|create|update)'\)/g)??[]).length,9);
 assert.match(source,/request\.agencyRbac\?\.activeAgencyId/);
 assert.match(source,/requested&&requested!==agencyId/);
 assert.match(source,/agency_id=\? AND .*assigned_user_id=\?/);
});

test('les affectataires clients proviennent de l’agence active',()=>{
 assert.match(source,/JOIN user_agencies/);
 assert.match(source,/JOIN user_agency_roles/);
 assert.match(source,/rp\.scope IN\('OWN','AGENCY'\)/);
 assert.doesNotMatch(source,/JOIN user_roles ur ON ur\.user_id=u\.id/);
});

test('toutes les écritures client migrées sont fraîches et verrouillées',()=>{
 assert.match(source,/withCurrentAgencyAuthorization/);
 assert.match(source,/withLockedCustomer/);
 assert.match(source,/SELECT \* FROM customers WHERE id=\? FOR UPDATE/);
 assert.doesNotMatch(source,/await execute\(/);
 assert.doesNotMatch(source,/await transaction\(/);
});

test('Client 360 reste explicitement sur le guard historique jusqu’aux producteurs',()=>{
 assert.match(source,/get\('\/customers\/:id\/360',requirePermission\('customers\.view'\)/);
 assert.match(source,/l\.agency_id=\?/);
});
