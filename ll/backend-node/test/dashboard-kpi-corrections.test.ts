import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const dashboard=readFileSync(new URL('../src/modules/dashboard/dashboard.routes.ts',import.meta.url),'utf8');
const workshop=readFileSync(new URL('../src/modules/workshop/workshop.routes.ts',import.meta.url),'utf8');
const deliveries=readFileSync(new URL('../src/modules/deliveries/delivery.routes.ts',import.meta.url),'utf8');

test('CORR-DASH-01 le CA facturé exclut brouillons et annulations',()=>{
  assert.match(dashboard,/i\.status NOT IN\('draft','cancelled'\)/);
  assert.doesNotMatch(dashboard,/i\.status<>'cancelled'/);
});

test('CORR-DASH-02 les avoirs suivent leur propre date comptable',()=>{
  assert.match(dashboard,/DATE\(cn\.issue_date\) day,-cn\.amount/);
  assert.match(dashboard,/cn\.issue_date>=DATE_SUB\(CURDATE\(\),INTERVAL WEEKDAY\(CURDATE\(\)\) DAY\)/);
});

test('CORR-DASH-03 marge et ventes partagent les statuts admissibles',()=>{
  const active=/s\.status IN\('confirmed','preparation','ready_for_delivery','delivered'\)/g;
  assert.ok((dashboard.match(active)??[]).length>=2);
});

test('CORR-DASH-04 périodes courantes ont une borne haute et séries complètes',()=>{
  assert.match(dashboard,/INTERVAL 7 DAY/);
  assert.match(dashboard,/INTERVAL 1 MONTH/);
  assert.match(dashboard,/WITH RECURSIVE calendar/);
  assert.match(dashboard,/WITH RECURSIVE months/);
  assert.match(dashboard,/weeklyPrevious/);
});

test('CORR-DASH-05 widgets filtrent côté serveur avec les contrats métier',()=>{
  assert.match(workshop,/r\.query\.active === 'true'[\s\S]*REPAIR_ORDER_IN_WORKSHOP_STATUSES/);
  assert.match(deliveries,/request\.query\.active === 'true'[\s\S]*d\.status IN\('planned','preparing','quality_control','ready'\)/);
  assert.match(deliveries,/d\.scheduled_at>=NOW\(\)/);
});
