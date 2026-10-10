import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {workshopOrigin,workshopOrigins} from '../src/modules/reports/workshop-report.service.js';
import {workshopReportCsv} from '../src/modules/reports/report.csv.js';
import type {WorkshopReportAggregate} from '../src/modules/reports/workshop-report.service.js';

const service=readFileSync(new URL('../src/modules/reports/workshop-report.service.ts',import.meta.url),'utf8');
const routes=readFileSync(new URL('../src/modules/reports/report.routes.ts',import.meta.url),'utf8');

test('14C5B origine validée sans fallback ni reclassement',()=>{
  assert.deepEqual(workshopOrigins,['CONCESSION','EXTERNAL','UNKNOWN']);
  assert.equal(workshopOrigin('external'),'EXTERNAL');
  assert.equal(workshopOrigin(''),undefined);
  assert.throws(()=>workshopOrigin("EXTERNAL' OR 1=1"),/Origine commerciale invalide/);
  assert.doesNotMatch(service,/vehicles\.commercial_origin|is_commercial_stock|sale_items/);
});

test('14C5B dates semi-ouvertes et sources métier distinctes',()=>{
  for(const token of ['ro.created_at>=? AND ro.created_at<?','ro.closed_at>=? AND ro.closed_at<?','i.issue_date>=? AND i.issue_date<?','cn.issue_date>=? AND cn.issue_date<?','p.payment_date>=? AND p.payment_date<?','pr.refunded_at>=? AND pr.refunded_at<?'])assert.ok(service.includes(token),token);
  assert.doesNotMatch(service,/DATE\((?:ro\.created_at|p\.payment_date|pr\.refunded_at)\)/);
});

test('14C5B montants préagrégés sans SUM DISTINCT ni actual_total',()=>{
  assert.match(service,/roi\.status='active'/);
  assert.match(service,/roi\.line_total\*\(1\+roi\.tax_rate\/100\)/);
  assert.match(service,/ro\.status NOT IN\('cancelled','abandonment_pending','abandoned'\)/);
  assert.doesNotMatch(service,/SUM\(DISTINCT|actual_total/);
});

test('14C5B finance filtre statuts et déduplique le remboursement legacy',()=>{
  assert.match(service,/i\.status NOT IN\('draft','cancelled'\)/);
  assert.match(service,/cn\.status IN\('issued','applied'\)/);
  assert.match(service,/p\.status IN\('confirmed','refunded'\)/);
  assert.match(service,/p\.status='refunded'.*NOT EXISTS\(SELECT 1 FROM payment_refunds dedupe WHERE dedupe\.payment_id=p\.id\)/s);
  assert.doesNotMatch(service,/amount_paid/);
});

test('14C5B rapport et export réutilisent le même agrégateur et le RBAC financier',()=>{
  assert.equal((routes.match(/aggregateWorkshopReport\(/g)??[]).length,2);
  assert.match(routes,/workshop:\['workshop\.productivity\.view','billing\.view','billing\.payment\.view'\]/);
  assert.match(routes,/origin:workshopOrigin\(r\.query\.origin\)/);
});

test('14C5B CSV conserve BOM, protège les cellules et expose les trois groupes',()=>{
  const group=(origin:'CONCESSION'|'EXTERNAL'|'UNKNOWN',value:number)=>({origin,repairOrdersCreated:value,activeOrders:0,completedOrders:0,cancelledOrders:0,abandonedOrders:0,closedOrdersInPeriod:value,distinctCustomers:value,distinctVehicles:value,interventionAmount:value,netInvoiced:value,netCollected:value,currentOutstanding:value});
  const report={repair_orders_count:6,active_orders:0,completed_orders:0,warranty_orders:0,average_lead_time:0,planned_hours:0,worked_hours:0,billed_hours:0,workshop_revenue:6,workshop_collected:6,workshop_outstanding:6,invoiced_orders:3,averageRepairOrder:2,productivityRate:0,efficiencyRate:0,interventionAmount:6,closedOrdersInPeriod:6,distinctCustomers:6,distinctVehicles:6,byCommercialOrigin:[group('CONCESSION',1),group('EXTERNAL',2),group('UNKNOWN',3)]} satisfies WorkshopReportAggregate;
  const csv=workshopReportCsv(report,'2026-09-01','2026-09-30','=Agence');
  assert.ok(csv.startsWith('\ufeff'));
  assert.match(csv,/"Concession";"1";"1";"1";"1";"1";"1";"1";"1"/);
  assert.match(csv,/"Extérieur";"2";"2";"2";"2";"2";"2";"2";"2"/);
  assert.match(csv,/"Inconnue";"3";"3";"3";"3";"3";"3";"3";"3"/);
  assert.match(csv,/"'=Agence"/);
});
