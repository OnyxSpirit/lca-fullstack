import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{mergeAgencyPermissions}from'../src/modules/rbac/agency-rbac.service.js';

test('PH2A fusion déterministe des permissions et scopes',()=>{
 const merged=mergeAgencyPermissions([
  {code:'x',scope:'OWN'},{code:'x',scope:'AGENCY'},{code:'x',scope:'OWN'},
  {code:'y',scope:'AGENCY'},{code:'y',scope:'CONCESSION'},
  {code:'z',scope:'CONCESSION'},{code:'z',scope:'GLOBAL'},
  {code:'plain',scope:null},{code:'plain',scope:null},
 ]);
 assert.deepEqual([...merged.entries()],[['x','AGENCY'],['y','CONCESSION'],['z','GLOBAL'],['plain',null]]);
});

test('PH2A sépare explicitement le nouveau contexte du RBAC historique',()=>{
 const root=new URL('../',import.meta.url),read=(path:string)=>readFileSync(new URL(path,root),'utf8');
 const authenticate=read('src/middleware/authenticate.ts'),legacy=read('src/modules/rbac/rbac.service.ts'),agency=read('src/modules/rbac/agency-rbac.service.ts');
 assert.match(authenticate,/request\.rbac=await resolveRbacContext/);assert.doesNotMatch(authenticate,/resolveAgencyRbacContext/);
 assert.match(legacy,/JOIN user_roles ur/);assert.doesNotMatch(legacy,/user_agency_roles/);
 assert.match(agency,/JOIN user_agency_roles uar/);assert.match(agency,/r\.is_system=FALSE/);assert.match(agency,/r\.code='SUPER_ADMIN' AND r\.is_system=TRUE/);
});
