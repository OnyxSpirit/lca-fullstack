import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const root=new URL('../',import.meta.url),read=(path:string)=>readFileSync(new URL(path,root),'utf8');
const migration=read('database/migrations/114_rbac_multi_agency_foundation.sql');
const service=read('src/modules/users/user-agency.service.ts');
const routes=read('src/modules/users/user.routes.ts');
const users=read('src/modules/users/user.service.ts');
const rbac=read('src/modules/rbac/rbac.service.ts');

test('RBAC-P1-01 modèle additif multi-agences et rôles par affectation',()=>{
 assert.match(migration,/CREATE TABLE user_agencies/);assert.match(migration,/CREATE TABLE user_agency_roles/);
 assert.match(migration,/UNIQUE KEY uq_user_agency \(user_id,agency_id\)/);assert.match(migration,/UNIQUE KEY uq_user_active_primary_agency/);
 assert.match(migration,/FOREIGN KEY \(user_agency_id\) REFERENCES user_agencies\(id\) ON DELETE CASCADE/);
 assert.match(migration,/FOREIGN KEY \(user_id\) REFERENCES users\(id\) ON DELETE RESTRICT/);
 assert.doesNotMatch(migration,/deactivated_at IS NULL AND deactivated_by IS NULL/);
 assert.doesNotMatch(migration,/DROP TABLE|DROP COLUMN|ALTER TABLE users|ALTER TABLE user_roles/i);
});

test('RBAC-P1-02 reprise déterministe sans duplication du rôle système',()=>{
 assert.match(migration,/SELECT u\.id,u\.agency_id,TRUE,'ACTIVE'/);assert.match(migration,/ON DUPLICATE KEY UPDATE/);
 assert.match(migration,/r\.is_system=FALSE/);assert.doesNotMatch(migration,/scope\s*=|CONCESSION|GLOBAL/);
});

test('RBAC-P1-03 endpoints authentifiés et permissions administratives explicites',()=>{
 for(const token of["requirePermission('users.view')","requirePermission('users.assign_agency')","requirePermission('users.assign_role')"])assert.match(routes,new RegExp(token.replace(/[().]/g,'\\$&')));
 assert.match(service,/assertCanManage/);assert.match(service,/assertAgencyInActorScope/);assert.match(service,/writeAudit/);
});

test('RBAC-P1-04 la phase 1 ne remplace pas le moteur RBAC courant',()=>{
 assert.match(rbac,/JOIN user_roles ur/);assert.doesNotMatch(rbac,/user_agency_roles/);
 assert.match(service,/phase 2/);assert.match(service,/rôle système reste central/);
});

test('RBAC-P1-05 les écritures historiques synchronisent le modèle préparatoire',()=>{
 assert.match(users,/syncLegacyUserAgency/);assert.match(service,/DELETE uar FROM user_agency_roles/);
 assert.match(users,/agencyAssignments/);assert.match(users,/INSERT IGNORE INTO user_agency_roles/);
});
