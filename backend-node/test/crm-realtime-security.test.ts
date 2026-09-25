import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {canReadCrmLead,selectCrmLeadRealtimeRecipients,type CrmLeadVisibilityCandidate} from '../src/modules/crm/crm-visibility.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');

const resource={assignedUserId:'USER_A',agencyId:'AGENCY_A',concessionId:'CONCESSION_A'};
const candidate=(userId:string,scope:CrmLeadVisibilityCandidate['scope'],agencyId:string|null,concessionId:string|null,permissionCode:string|null='crm.prospect.view',roleCode:string|null='SALES',roleIsSystem=false):CrmLeadVisibilityCandidate=>({userId,scope,agencyId,concessionId,permissionCode,roleCode,roleIsSystem});

test('PARITY-01..10 et SEC-01..11 sélectionnent réellement les destinataires selon crm.prospect.view',()=>{
  const candidates=[
    candidate('NO_PERMISSION','GLOBAL','AGENCY_A','CONCESSION_A',null),
    candidate('USER_B','OWN','AGENCY_B','CONCESSION_B'),
    candidate('USER_A','OWN','AGENCY_A','CONCESSION_A'),
    candidate('AGENCY_A_READER','AGENCY','AGENCY_A','CONCESSION_A'),
    candidate('AGENCY_B_READER','AGENCY','AGENCY_B','CONCESSION_B'),
    candidate('CONCESSION_A_READER','CONCESSION','AGENCY_C','CONCESSION_A'),
    candidate('CONCESSION_B_READER','CONCESSION','AGENCY_B','CONCESSION_B'),
    candidate('GLOBAL_CRM','GLOBAL',null,null),
    candidate('GLOBAL_SALES','GLOBAL',null,null,'sales.view'),
    candidate('FAKE_SUPER','OWN','AGENCY_B','CONCESSION_B',null,'SUPER_ADMIN',false),
    candidate('SYSTEM_SUPER','OWN',null,null,null,'SUPER_ADMIN',true),
  ];
  assert.deepEqual(selectCrmLeadRealtimeRecipients(resource,candidates),['USER_A','AGENCY_A_READER','CONCESSION_A_READER','GLOBAL_CRM','SYSTEM_SUPER']);
});

test('REALTIME VISIBILITY ⊆ HTTP READ VISIBILITY avec Lead A et Opportunity B divergent',()=>{
  const opportunityAssignedUserId='USER_B';
  assert.notEqual(resource.assignedUserId,opportunityAssignedUserId);
  const ownA=candidate('USER_A','OWN','AGENCY_A','CONCESSION_A'),ownB=candidate('USER_B','OWN','AGENCY_B','CONCESSION_B');
  assert.equal(canReadCrmLead(resource,ownA),true);
  assert.equal(canReadCrmLead(resource,ownB),false);
  const realtime=read('../src/modules/crm/crm.realtime.ts');
  assert.match(realtime,/l\.assigned_user_id/);
  assert.doesNotMatch(realtime,/owner\.id=o\.assigned_user_id|SELECT[^\n]*o\.assigned_user_id/);
});

test('le routage utilise uniquement les rooms utilisateur et le vrai Super Admin',()=>{
  const source=read('../src/modules/crm/crm.realtime.ts');
  assert.match(source,/r\.code='SUPER_ADMIN' AND r\.is_system=TRUE/);
  assert.match(source,/p\.code='crm\.prospect\.view'/);
  assert.match(source,/emitToUser/);
  assert.doesNotMatch(source,/emitToAgency|emitToAgencyAndGlobals|broadcast/);
});

test('payload CRM minimal et sans donnée métier sensible',()=>{
  const source=read('../src/modules/crm/crm.realtime.ts');
  assert.match(source,/leadId:string;opportunityId:string;changeType:CrmLeadChangeType;customerChanged:boolean/);
  assert.doesNotMatch(source,/payload[^\n]*(?:email|phone|budget|notes|firstName|lastName)/i);
});

test('TX-01..05 chaque publication métier est placée après la transaction et reste best-effort',()=>{
  const crm=read('../src/modules/crm/crm.routes.ts'),showroom=read('../src/modules/showroom/showroom.routes.ts'),quotation=read('../src/modules/quotations/quotation.service.ts'),sale=read('../src/modules/sales/sale.service.ts'),publisher=read('../src/modules/crm/crm.realtime.ts');
  assert.ok(crm.indexOf('const created=await transaction')<crm.indexOf("changeType:'created'"));
  assert.ok(crm.indexOf("UPDATE opportunities SET stage=?")<crm.indexOf("changeType:'stage'"));
  assert.ok(showroom.indexOf('const result=await transaction')<showroom.indexOf("changeType:'test_drive'"));
  assert.ok(quotation.indexOf('const created=await createLegacy')<quotation.indexOf("changeType:'quotation'"));
  assert.ok(sale.indexOf("UPDATE opportunities SET stage='won'")<sale.indexOf("changeType:'sale'"));
  assert.match(publisher,/catch\(error\)[\s\S]*Événement CRM non émis/);
});

test('RTCRM-01..09 les neuf familles convergentes publient le hint générique',()=>{
  const combined=[read('../src/modules/crm/crm.routes.ts'),read('../src/modules/showroom/showroom.routes.ts'),read('../src/modules/quotations/quotation.service.ts'),read('../src/modules/sales/sale.service.ts')].join('\n');
  for(const change of ['created','updated','stage','appointment','test_drive','quotation','sale','activity'])assert.match(combined,new RegExp(`changeType:'${change}'`));
  assert.match(combined,/changeType:'quotation',customerChanged:true/);
  assert.match(combined,/changeType:'sale',customerChanged:true/);
});
