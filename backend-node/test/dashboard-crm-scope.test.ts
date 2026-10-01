import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Request} from 'express';
import {canReadCrmLead,crmLeadScope} from '../src/modules/crm/crm-visibility.js';

type Scope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
const request=(scope:Scope,userId='11',agencyId='101')=>({query:{},user:{sub:userId,agencyId,roles:['DASHBOARD_TEST']},rbac:{roleId:'2',roleCode:'DASHBOARD_TEST',isSuperAdmin:false,permissions:new Map([['dashboard.view','GLOBAL'],['crm.prospect.view',scope]])}}) as unknown as Request;
const dashboard=readFileSync(new URL('../src/modules/dashboard/dashboard.routes.ts',import.meta.url),'utf8');
const visible=(scope:Scope,resource:{assignedUserId:string|null;agencyId:string|null;concessionId:string|null},userId='11',agencyId:string|null='101',concessionId:string|null='10')=>canReadCrmLead(resource,{userId,agencyId,concessionId,permissionCode:'crm.prospect.view',scope});

test('DASH-CRM-01 GLOBAL utilise le périmètre CRM sans restriction',()=>assert.deepEqual(crmLeadScope(request('GLOBAL'),'crm.prospect.view'),{sql:'1=1',params:[]}));
test('DASH-CRM-02 OWN conserve agence canonique et propriétaire CRM',()=>assert.deepEqual(crmLeadScope(request('OWN'),'crm.prospect.view'),{sql:'COALESCE(u.agency_id,creator.agency_id)=? AND l.assigned_user_id=?',params:['101','11']}));
test('DASH-CRM-03 AGENCY utilise l’agence du propriétaire avec repli créateur',()=>assert.deepEqual(crmLeadScope(request('AGENCY'),'crm.prospect.view'),{sql:'COALESCE(u.agency_id,creator.agency_id)=?',params:['101']}));
test('DASH-CRM-04 CONCESSION utilise les agences de la concession canonique',()=>{const result=crmLeadScope(request('CONCESSION'),'crm.prospect.view');assert.match(result.sql,/COALESCE\(u\.agency_id,creator\.agency_id\) IN/);assert.match(result.sql,/concession_id/);assert.deepEqual(result.params,['101'])});
test('DASH-CRM-05/06 une permission CRM absente omet le KPI malgré dashboard.view',()=>assert.match(dashboard,/has\(r,'crm\.prospect\.view'\)\?crmLeadScope/));
test('DASH-CRM-07 deux agences différentes sont séparées par AGENCY',()=>{assert.equal(visible('AGENCY',{assignedUserId:'11',agencyId:'101',concessionId:'10'}),true);assert.equal(visible('AGENCY',{assignedUserId:'22',agencyId:'102',concessionId:'10'}),false)});
test('DASH-CRM-08 deux agences de la même concession sont visibles par CONCESSION',()=>assert.equal(visible('CONCESSION',{assignedUserId:'22',agencyId:'102',concessionId:'10'}),true));
test('DASH-CRM-09 deux concessions différentes sont séparées',()=>assert.equal(visible('CONCESSION',{assignedUserId:'33',agencyId:'201',concessionId:'20'}),false));
test('DASH-CRM-10 prospect non affecté hérite de l’agence du créateur, mais jamais de OWN',()=>{assert.equal(visible('AGENCY',{assignedUserId:null,agencyId:'101',concessionId:'10'}),true);assert.equal(visible('OWN',{assignedUserId:null,agencyId:'101',concessionId:'10'}),false)});
test('DASH-CRM-11 prospect affecté au même utilisateur est visible en OWN',()=>assert.equal(visible('OWN',{assignedUserId:'11',agencyId:'101',concessionId:'10'}),true));
test('DASH-CRM-12 prospect affecté à une autre agence est exclu de OWN et AGENCY',()=>{const other={assignedUserId:'22',agencyId:'102',concessionId:'10'};assert.equal(visible('OWN',other),false);assert.equal(visible('AGENCY',other),false)});
test('Dashboard joint les relations CRM canoniques et ne filtre plus les KPI sur l.agency_id',()=>{const overview=dashboard.slice(dashboard.indexOf("dashboardRouter.get('/dashboard/overview'"),dashboard.indexOf("dashboardRouter.get('/global-search'"));assert.match(overview,/LEFT JOIN users u ON u\.id=\$\{CRM_LEAD_OWNER_SQL\}/);assert.match(overview,/LEFT JOIN users creator ON creator\.id=l\.created_by/);assert.doesNotMatch(overview,/l\.agency_id/)});
