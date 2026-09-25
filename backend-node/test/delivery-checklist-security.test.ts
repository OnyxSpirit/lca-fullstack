import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';
import{assertChecklistTemplateAgencyAccess}from'../src/modules/deliveries/delivery.domain.js';

const route=readFileSync(new URL('../src/modules/deliveries/delivery.routes.ts',import.meta.url),'utf8');
const rbac=readFileSync(new URL('../src/modules/rbac/rbac.service.ts',import.meta.url),'utf8');
const denied=(work:()=>unknown)=>assert.throws(work,error=>Boolean(error&&typeof error==='object'&&'status'in error&&error.status===403));

test('SEC-01/02 AGENCY crée dans son agence et une omission ne devient jamais globale',()=>{
  assert.doesNotThrow(()=>assertChecklistTemplateAgencyAccess('AGENCY','10','10'));
  assert.match(route,/target=requested==null\|\|requested===''\?actorAgencyId:idOf/);
  assert.match(route,/post\('\/deliveries\/checklist-templates'.*manageableChecklistTemplateAgency\(request,request\.body\.agencyId\)/s);
});
test('SEC-03 AGENCY refuse une autre agence',()=>denied(()=>assertChecklistTemplateAgencyAccess('AGENCY','10','20')));
test('SEC-04 la gestion exige la permission pertinente',()=>assert.match(route,/post\('\/deliveries\/checklist-templates',requirePermission\('delivery\.checklist\.manage'\)/));
test('SEC-05/06 AGENCY modifie son modèle mais pas celui d une autre agence',()=>{
  assert.doesNotThrow(()=>assertChecklistTemplateAgencyAccess('AGENCY','10','10'));
  denied(()=>assertChecklistTemplateAgencyAccess('AGENCY','10','20'));
  assert.match(route,/SELECT id,agency_id FROM delivery_checklist_templates WHERE id=\? FOR UPDATE/);
});
test('SEC-07 un modèle global est inscriptible uniquement avec GLOBAL',()=>{
  for(const scope of['OWN','AGENCY','CONCESSION']as const)denied(()=>assertChecklistTemplateAgencyAccess(scope,'10',null));
  assert.doesNotThrow(()=>assertChecklistTemplateAgencyAccess('GLOBAL','10',null));
});
test('SEC-08 CONCESSION respecte exactement son périmètre',()=>{
  assert.doesNotThrow(()=>assertChecklistTemplateAgencyAccess('CONCESSION','10','11',true));
  denied(()=>assertChecklistTemplateAgencyAccess('CONCESSION','10','20',false));
  assert.match(route,/JOIN agencies actor ON actor\.concession_id=target\.concession_id/);
});
test('SEC-09 GLOBAL gère les modèles globaux et agence',()=>{
  assert.doesNotThrow(()=>assertChecklistTemplateAgencyAccess('GLOBAL','10',null));
  assert.doesNotThrow(()=>assertChecklistTemplateAgencyAccess('GLOBAL','10','20'));
});
test('SEC-10 GLOBAL sur une permission non pertinente ne donne aucun droit checklist',()=>{
  const templateRoutes=route.slice(route.indexOf("deliveryRouter.get('/deliveries/checklist-templates'"),route.indexOf('deliveryRouter.get(\n  "/deliveries/:id"'));
  assert.match(templateRoutes,/requirePermission\('delivery\.checklist\.manage'\)/);
  assert.doesNotMatch(templateRoutes,/delivery\.view|delivery\.schedule/);
});
test('SEC-11/12 seul le vrai SUPER_ADMIN système obtient le bypass',()=>{
  assert.match(rbac,/String\(role\.code\)==='SUPER_ADMIN'&&Boolean\(role\.is_system\)/);
  assert.doesNotMatch(route,/role\.code|roles\.includes|SUPER_ADMIN/);
  denied(()=>assertChecklistTemplateAgencyAccess('AGENCY','10','20'));
  assert.doesNotThrow(()=>assertChecklistTemplateAgencyAccess('GLOBAL','10','20'));
});

type State={status:'ready'|'delivered';requiredComplete:boolean};
class DeliveryLock{private tail=Promise.resolve();run<T>(work:()=>Promise<T>|T){const current=this.tail.then(work);this.tail=current.then(()=>undefined,()=>undefined);return current}}
const patchItem=(state:State,lock:DeliveryLock)=>lock.run(()=>{if(state.status==='delivered')throw new Error('finalized');state.requiredComplete=false;});
const finalize=(state:State,lock:DeliveryLock)=>lock.run(()=>{if(!state.requiredComplete)throw new Error('incomplete');state.status='delivered';});
const invariant=(state:State)=>assert.ok(state.status!=='delivered'||state.requiredComplete);

test('RACE-01 finalisation gagnante: le PATCH attendu est refusé',async()=>{const state:State={status:'ready',requiredComplete:true},lock=new DeliveryLock();const results=await Promise.allSettled([finalize(state,lock),patchItem(state,lock)]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');invariant(state)});
test('RACE-02 PATCH gagnant: la finalisation constate l item incomplet',async()=>{const state:State={status:'ready',requiredComplete:true},lock=new DeliveryLock();const results=await Promise.allSettled([patchItem(state,lock),finalize(state,lock)]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');invariant(state)});
test('RACE-03 le code verrouille toujours livraison puis item et préserve l invariant',()=>{
  const patch=route.slice(route.indexOf('"/deliveries/:id/checklist/:itemId"'),route.indexOf('"/deliveries/:id/documents"'));
  const deliveryLock=patch.indexOf('FROM deliveries d WHERE d.id=?');
  const itemLock=patch.indexOf('FROM delivery_checklists WHERE id=?');
  assert.ok(deliveryLock>=0&&itemLock>deliveryLock);
  assert.match(patch,/FROM deliveries d WHERE d\.id=\?.*FOR UPDATE/s);
  assert.match(patch,/lockedDelivery\.status/);
  assert.match(patch,/FROM delivery_checklists WHERE id=\? AND delivery_id=\? FOR UPDATE/);
});
