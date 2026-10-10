import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import test from'node:test';

const configRoute=readFileSync(new URL('../src/modules/deliveries/delivery-checklist.routes.ts',import.meta.url),'utf8');
const deliveryRoute=readFileSync(new URL('../src/modules/deliveries/delivery.routes.ts',import.meta.url),'utf8');
const rbac=readFileSync(new URL('../src/modules/rbac/rbac.service.ts',import.meta.url),'utf8');

test('SEC-01/02 la configuration collective refuse OWN et AGENCY',()=>{
  assert.match(configRoute,/permissionScope==='OWN'\|\|permissionScope==='AGENCY'/);
  assert.match(configRoute,/configuration collective refuse les périmètres OWN et AGENCY/);
});
test('SEC-03/04 lecture et gestion exigent des permissions distinctes',()=>{
  assert.match(configRoute,/get\('\/delivery-checklist-config',requirePermission\('delivery\.checklist\.config\.view'\)/);
  assert.match(configRoute,/post\('\/delivery-checklist-config\/categories',requirePermission\('delivery\.checklist\.config\.manage'\)/);
  assert.match(configRoute,/patch\('\/delivery-checklist-config\/items\/:id',requirePermission\('delivery\.checklist\.config\.manage'\)/);
  assert.doesNotMatch(configRoute,/delivery\.checklist\.view|delivery\.checklist\.manage/);
});
test('SEC-05/06 catégories et éléments sont verrouillés dans la concession de l acteur',()=>{
  assert.match(configRoute,/delivery_checklist_categories WHERE id=\? AND concession_id=\? FOR UPDATE/);
  assert.match(configRoute,/JOIN delivery_checklist_categories c ON c\.id=i\.category_id WHERE i\.id=\? AND c\.concession_id=\? FOR UPDATE/);
  assert.match(configRoute,/SELECT concession_id FROM agencies WHERE id=\?/);
});
test('SEC-07/08 CONCESSION reste dans sa concession et GLOBAL peut cibler explicitement',()=>{
  assert.match(configRoute,/permissionScope==='GLOBAL'&&requested!=null&&requested!==''\)return idOf\(requested\)/);
  assert.match(configRoute,/permissionScope==='GLOBAL'\|\|permissionScope==='CONCESSION'\)return String\(actor\.concession_id\)/);
  assert.doesNotMatch(configRoute,/permissionScope==='CONCESSION'.*requested/s);
});
test('SEC-09/10 aucune permission non pertinente ni bypass de rôle local',()=>{
  assert.doesNotMatch(configRoute,/delivery\.view|delivery\.schedule|role\.code|roles\.includes|SUPER_ADMIN/);
  assert.match(rbac,/String\(role\.code\)==='SUPER_ADMIN'&&Boolean\(role\.is_system\)/);
});

type State={status:'ready'|'delivered';requiredComplete:boolean};
class DeliveryLock{private tail=Promise.resolve();run<T>(work:()=>Promise<T>|T){const current=this.tail.then(work);this.tail=current.then(()=>undefined,()=>undefined);return current}}
const patchItem=(state:State,lock:DeliveryLock)=>lock.run(()=>{if(state.status==='delivered')throw new Error('finalized');state.requiredComplete=false;});
const finalize=(state:State,lock:DeliveryLock)=>lock.run(()=>{if(!state.requiredComplete)throw new Error('incomplete');state.status='delivered';});
const invariant=(state:State)=>assert.ok(state.status!=='delivered'||state.requiredComplete);

test('RACE-01 finalisation gagnante: le PATCH attendu est refusé',async()=>{const state:State={status:'ready',requiredComplete:true},lock=new DeliveryLock();const results=await Promise.allSettled([finalize(state,lock),patchItem(state,lock)]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');invariant(state)});
test('RACE-02 PATCH gagnant: la finalisation constate l item incomplet',async()=>{const state:State={status:'ready',requiredComplete:true},lock=new DeliveryLock();const results=await Promise.allSettled([patchItem(state,lock),finalize(state,lock)]);assert.equal(results[0].status,'fulfilled');assert.equal(results[1].status,'rejected');invariant(state)});
test('RACE-03 le code verrouille toujours livraison puis instance et préserve l invariant',()=>{
  const patch=deliveryRoute.slice(deliveryRoute.indexOf('"/deliveries/:id/checklist/:itemId"'),deliveryRoute.indexOf('"/deliveries/:id/documents"'));
  const deliveryLock=patch.indexOf('FROM deliveries d WHERE d.id=?');
  const itemLock=patch.indexOf('FROM delivery_checklist_item_instances ii');
  assert.ok(deliveryLock>=0&&itemLock>deliveryLock);
  assert.match(patch,/FROM deliveries d WHERE d\.id=\?.*FOR UPDATE/s);
  assert.match(patch,/lockedDelivery\.status/);
  assert.match(patch,/FROM delivery_checklist_item_instances ii.*WHERE ii\.id=\? AND ci\.delivery_id=\? FOR UPDATE/s);
});
