import assert from'node:assert/strict';
import{readFile}from'node:fs/promises';
import test from'node:test';
import{repairOrderStatusFromDb}from'../src/services/mysqlStatusMap';

const read=(path:string)=>readFile(new URL(path,import.meta.url),'utf8');

test('SAV-OR-UX-05 conserve Planifié et expose Annulé depuis le statut backend',()=>{
  assert.equal(repairOrderStatusFromDb.planned,'PLANIFIE');
  assert.equal(repairOrderStatusFromDb.cancelled,'ANNULE');
});

test('SAV-OR-UX-05 utilise le KPI backend sans recompter localement les OR',async()=>{
  const page=await read('../src/modules/service/ServiceDashboardPage.tsx');
  assert.match(page,/stats\.data\?\.inWorkshop/);
  assert.doesNotMatch(page,/const openORCount/);
  assert.match(page,/<option value="ANNULE">Annulé<\/option>/);
});

test('SAV-OR-UX-05 refuse un statut OR inconnu au lieu de le présenter comme Planifié',async()=>{
  const hooks=await read('../src/api/erpHooks.ts');
  assert.match(hooks,/if\(!mapped\)throw new Error\(`Statut OR backend inconnu/);
  assert.doesNotMatch(hooks,/repairOrderStatusFromDb\[[^\]]+\]\s*\?\?\s*["']PLANIFIE["']/);
});

test('SAV-OR-UX-05 ne repropose pas l’annulation sur un OR déjà annulé',async()=>{
  const detail=await read('../src/modules/service/RepairOrderDetailPage.tsx');
  assert.match(detail,/\['PRET','FACTURE','LIVRE','CLOTURE','ANNULE'\]\.includes\(ro\.status\)/);
});

test('SAV-OR-UX-05 invalide liste et statistiques après annulation puis les recharge au remount',async()=>{
  const hooks=await read('../src/api/erpHooks.ts');
  assert.match(hooks,/useRepairStatusMutation[\s\S]*invalidateQueries\(\{ queryKey: erpKeys\.repairOrders \}\)/);
  assert.match(hooks,/queryKey:\["repair-orders","stats"\]/);
  const bootstrap=await read('../src/components/AppBootstrap.tsx');
  assert.match(bootstrap,/'workshop:status': erpKeys\.repairOrders/);
});
