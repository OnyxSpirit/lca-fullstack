import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const read=(path:string)=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
const dashboard=read('src/modules/dashboard/DashboardPage.tsx');
const hooks=read('src/api/erpHooks.ts');

test('CORR-FE-01 widgets demandent les éléments actifs au serveur',()=>{
  assert.match(dashboard,/useActiveRepairOrdersQuery\(canViewService\)/);
  assert.match(dashboard,/useDeliveriesQuery\(\{active:true\},canViewDeliveries\)/);
  assert.match(hooks,/\/repair-orders\?active=true/);
});

test('CORR-FE-02 variation CA positive négative et inconnue a une couleur distincte',()=>{
  assert.match(dashboard,/revenueDelta==null\?'text-zinc-400':revenueDelta<0\?'text-red-400':'text-emerald-500'/);
});

test('CORR-FE-03 erreur Dashboard et relance sont explicites',()=>{
  assert.match(dashboard,/overviewQuery\.isError/);
  assert.match(dashboard,/role="alert"/);
  assert.match(dashboard,/overviewQuery\.refetch\(\)/);
});

test('CORR-FE-04 cartes KPI sont des liens clavier natifs',()=>{
  for(const destination of ['/billing','/sales','/crm','/vehicles','/showroom'])assert.match(dashboard,new RegExp(`to="${destination}"`));
  assert.doesNotMatch(dashboard,/onClick=\{\(\) => navigate\('\/(billing|sales|crm|vehicles)'\)\}/);
});

test('CORR-FE-05 libellé et responsive reflètent le contrat',()=>{
  assert.match(dashboard,/Véhicules vendus ce mois/);
  assert.match(dashboard,/xl:grid-cols-4/);
  assert.match(dashboard,/overflow-x-hidden/);
});

test('CORR-FE-06 graphiques suivent billing.view sans étendre le backend',()=>{
  assert.match(dashboard,/canViewBilling&&<div className="min-w-0 lg:col-span-2/);
});
