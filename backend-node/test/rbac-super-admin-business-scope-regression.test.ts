import assert from'node:assert/strict';
import test from'node:test';
import type{Request}from'express';
import{assertAgencyBusinessPermission}from'../src/modules/rbac/agency-authorization.js';
import{crmLeadScope}from'../src/modules/crm/crm-visibility.js';
import{customerScope}from'../src/modules/customers/customer.routes.js';
import{quotationScope}from'../src/modules/quotations/quotation.service.js';
import{vehicleScope}from'../src/modules/vehicles/vehicle.routes.js';

const request=()=>({
 user:{sub:'1',sid:'session',agencyId:'99'},query:{},
 agencyRbac:{userId:'1',sessionId:'session',activeAgencyId:'10',contextVersion:1,isSuperAdmin:true,agencies:[],roles:[],permissions:new Map([
  ['crm.prospect.view','GLOBAL'],['customers.view','GLOBAL'],['vehicles.view','GLOBAL'],['quotations.view','GLOBAL'],
 ])},
 rbac:{isSuperAdmin:true,permissions:new Map([
  ['crm.prospect.view','AGENCY'],['customers.view','AGENCY'],['vehicles.view','AGENCY'],['quotations.view','AGENCY'],
 ])},
})as unknown as Request;

test('les quatre listes signalées consomment le scope métier normalisé du Super Administrateur',async()=>{
 const r=request();
 for(const permission of['crm.prospect.view','customers.view','vehicles.view','quotations.view'])assert.equal(await assertAgencyBusinessPermission(r,permission),'AGENCY');
 assert.deepEqual(crmLeadScope(r,'crm.prospect.view'),{sql:'l.agency_id=?',params:['10']});
 assert.deepEqual(customerScope(r,'customers.view'),{sql:'c.agency_id=?',params:['10']});
 assert.deepEqual(vehicleScope(r,'vehicles.view'),{sql:'v.agency_id=?',params:['10']});
 assert.deepEqual(quotationScope(r,'quotations.view'),{sql:'q.agency_id=?',params:['10']});
});
