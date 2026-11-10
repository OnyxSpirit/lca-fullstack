import assert from'node:assert/strict';
import test from'node:test';
import type{Request}from'express';
import type{RowDataPacket}from'mysql2/promise';
import{assertAgencyAccess,assertAgencyBusinessPermission,assertAgencyPermission,assertAgencyResource,assertAnyAgencyPermission,assertCentralAgencyPermission,assertInterAgencyAuthorization,authorizeAgencyResource,resolveAgencyDataScope,type AuthorizationRunner}from'../src/modules/rbac/agency-authorization.js';
import{HttpError}from'../src/shared/http-error.js';

const request=(permissions:Record<string,any>,agency='10',superAdmin=false)=>({user:{sub:'7',sid:'session',email:'x@test',roles:[],agencyId:'99'},agencyRbac:{userId:'7',sessionId:'session',activeAgencyId:agency,contextVersion:3,isSuperAdmin:superAdmin,agencies:[],roles:[],permissions:new Map(Object.entries(permissions))}})as unknown as Request;
const runner:AuthorizationRunner={execute:async<T extends RowDataPacket[]>()=>[[] as unknown as T,{}]};

test('PH2C2A permissions agence explicites sans héritage historique',async()=>{
 const r=request({read:'AGENCY',own:'OWN',historic:'GLOBAL'});assert.equal(await assertAgencyPermission(r,'read'),'AGENCY');assert.equal(await assertAgencyBusinessPermission(r,'own'),'OWN');assert.deepEqual(await assertAnyAgencyPermission(r,['missing','own']),{permission:'own',scope:'OWN'});
 await assert.rejects(()=>assertAgencyPermission(r,'missing'),(e:any)=>e instanceof HttpError&&e.status===403);
 await assert.rejects(()=>assertAgencyBusinessPermission(r,'historic'),/OWN ou AGENCY/);
});

test('PH2C2A compatibilité de ressource 2B refuse agence et propriétaire falsifiés',async()=>{
 const r=request({own:'OWN'});await assertAgencyAccess(r,'10');await assert.rejects(()=>assertAgencyAccess(r,'11'),/agence active/);
 await assertAgencyResource(r,'own',{agencyId:'10',ownerId:'7'});await assert.rejects(()=>assertAgencyResource(r,'own',{agencyId:'10',ownerId:'8'}),/OWN/);await assert.rejects(()=>assertAgencyResource(r,'own',{agencyId:'11',ownerId:'7'}),/agence active/);
});

test('PH2C2A stratégie de ressource charge agence et propriété indirecte côté serveur',async()=>{
 const resources:Record<string,{id:string;agency:string;technician:string}>={ok:{id:'ok',agency:'10',technician:'7'},other:{id:'other',agency:'10',technician:'8'},foreign:{id:'foreign',agency:'11',technician:'7'}};
 const strategy={load:async(_runner:AuthorizationRunner,id:string)=>resources[id]??null,agencyId:(resource:{agency:string})=>resource.agency,isOwner:({resource,userId}:{resource:{technician:string};userId:string})=>resource.technician===userId};
 const granted=await authorizeAgencyResource(request({work:'OWN'}),'work','ok',strategy);assert.equal(granted.resource.id,'ok');
 await assert.rejects(()=>authorizeAgencyResource(request({work:'OWN'}),'work','other',strategy),/OWN/);
 await assert.rejects(()=>authorizeAgencyResource(request({work:'OWN'}),'work','foreign',strategy),/agence active/);
 await assert.rejects(()=>authorizeAgencyResource(request({work:'OWN'}),'work','missing',strategy),e=>e instanceof HttpError&&e.status===404);
 await assert.rejects(()=>authorizeAgencyResource(request({work:'OWN'}),'work','ok',{...strategy,isOwner:undefined}),/règle de propriété/);
 await assert.rejects(()=>authorizeAgencyResource(request({work:'AGENCY'}),'work','ok',strategy,{lock:'update'}),/TRANSACTION_RUNNER/);
 assert.equal((await authorizeAgencyResource(request({work:'AGENCY'}),'work','ok',strategy,{runner,lock:'update'})).scope,'AGENCY');
});

test('PH2C2A prédicats SQL sûrs refusent historique et règles permissives',async()=>{
 assert.deepEqual(await resolveAgencyDataScope(request({p:'AGENCY'}),'p',{agencyColumn:'x.agency_id'}),{scope:'AGENCY',sql:'x.agency_id=?',params:['10']});
 assert.deepEqual(await resolveAgencyDataScope(request({p:'OWN'}),'p',{agencyColumn:'x.agency_id',ownPredicate:({userId})=>({sql:'x.assigned_to=?',params:[userId]})}),{scope:'OWN',sql:'x.agency_id=? AND (x.assigned_to=?)',params:['10','7']});
 await assert.rejects(()=>resolveAgencyDataScope(request({p:'OWN'}),'p',{agencyColumn:'x.agency_id'}),/règle de propriété/);
 await assert.rejects(()=>resolveAgencyDataScope(request({p:'GLOBAL'}),'p',{agencyColumn:'x.agency_id'}),/OWN ou AGENCY/);
 await assert.rejects(()=>resolveAgencyDataScope(request({p:'CONCESSION'}),'p',{agencyColumn:'x.agency_id'}),/OWN ou AGENCY/);
 await assert.rejects(()=>resolveAgencyDataScope(request({p:'OWN'}),'p',{agencyColumn:'x.agency_id',ownPredicate:()=>({sql:'1=1',params:[]})}),/UNSAFE/);
 await assert.rejects(()=>resolveAgencyDataScope(request({p:'AGENCY'}),'p',{agencyColumn:'x.agency_id OR 1=1'}),/UNSAFE/);
});

test('PH2C2A autorisation centrale reste SUPER_ADMIN système sans délégation implicite',async()=>{
 assert.equal(await assertCentralAgencyPermission(request({central:'GLOBAL'},'10',true),'central'),'GLOBAL');
 await assert.rejects(()=>assertCentralAgencyPermission(request({central:'GLOBAL'}),'central'),/centrale insuffisante/);
 await assert.rejects(()=>assertCentralAgencyPermission(request({},'10',true),'central'),/centrale insuffisante/);
});

test('PH2C2A workflow inter-agences exige une décision destination explicite',async()=>{
 let destinationChecked='';const allowed=await assertInterAgencyAuthorization(request({transfer:'AGENCY'}),{sourceAgencyId:'10',destinationAgencyId:'11',sourcePermission:'transfer',destinationAuthorization:async({destinationAgencyId})=>{destinationChecked=destinationAgencyId;return true}});assert.equal(destinationChecked,'11');assert.equal(allowed.destinationAgencyId,'11');
 await assert.rejects(()=>assertInterAgencyAuthorization(request({transfer:'AGENCY'}),{sourceAgencyId:'10',destinationAgencyId:'11',sourcePermission:'transfer',destinationAuthorization:async()=>false}),/destination/);
 await assert.rejects(()=>assertInterAgencyAuthorization(request({transfer:'AGENCY'}),{sourceAgencyId:'10',destinationAgencyId:'10',sourcePermission:'transfer',destinationAuthorization:async()=>true}),e=>e instanceof HttpError&&e.status===400);
 await assert.rejects(()=>assertInterAgencyAuthorization(request({transfer:'AGENCY'}),{sourceAgencyId:'12',destinationAgencyId:'11',sourcePermission:'transfer',destinationAuthorization:async()=>true}),/source/);
});
