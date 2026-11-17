import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import type{Request}from'express';
import{permissionScopePredicate}from'../src/modules/rbac/scope-intersection.js';

const routes=readFileSync(new URL('../src/modules/workshop/sav-operations.routes.ts',import.meta.url),'utf8');
const request=(scope:'OWN'|'AGENCY',superAdmin=false,activeAgencyId:string|null='12')=>({user:{sub:'7',sid:'s',agencyId:'99'},agencyRbac:{activeAgencyId,isSuperAdmin:true&&superAdmin,permissions:new Map([['service.journal.view',scope]])}})as unknown as Request;

test('SAV-FINAL-RBAC-01 Super Admin AGENCY reste borné à agence active',()=>{
 assert.deepEqual(permissionScopePredicate(request('AGENCY',true),'service.journal.view',{agency:'ro.agency_id'}),{sql:'ro.agency_id=?',params:['12']});
});

test('SAV-FINAL-RBAC-02 rôles ordinaires restent OWN ou AGENCY et GLOBAL ne fuit pas',()=>{
 assert.deepEqual(permissionScopePredicate(request('AGENCY'),'service.journal.view',{agency:'ro.agency_id'}),{sql:'ro.agency_id=?',params:['12']});
 assert.deepEqual(permissionScopePredicate(request('OWN'),'service.journal.view',{agency:'ro.agency_id',owner:'ro.advisor_id'}),{sql:'ro.agency_id=? AND ro.advisor_id=?',params:['12','7']});
 assert.equal(permissionScopePredicate(request('GLOBAL' as 'AGENCY'),'service.journal.view',{agency:'ro.agency_id'}),null);
 assert.equal(permissionScopePredicate(request('GLOBAL' as 'AGENCY',true,null),'service.journal.view',{agency:'ro.agency_id'}),null);
});

test('SAV-FINAL-JOURNAL-01 pagination filtres tri et export sont serveur',()=>{
 for(const token of["positiveInt(req.query.page","req.query.from?date","req.query.type","req.query.agencyId","sorts:Record<string,string>","LIMIT ? OFFSET ?","/sav/journal/export","financialCsv(csv)"])assert.ok(routes.includes(token),token);
 assert.match(routes,/requirePermission\('service\.reporting\.export'\)/);
});

test('SAV-FINAL-REPORTING-01 export respecte le scope reporting',()=>{
 assert.match(routes,/get\('\/sav\/reporting\/export',requirePermission\('service\.reporting\.export'\)/);
 assert.match(routes,/scope\(req,'service\.reporting\.view','ro'\)/);
});
