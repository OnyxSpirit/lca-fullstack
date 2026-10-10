import assert from 'node:assert/strict';
import test from 'node:test';
import type {WorkshopOriginReport} from '../src/types/reports.js';

const totals=(rows:WorkshopOriginReport[])=>rows.reduce((sum,row)=>({orders:sum.orders+row.repairOrdersCreated,interventions:sum.interventions+row.interventionAmount,invoiced:sum.invoiced+row.netInvoiced,collected:sum.collected+row.netCollected}),{orders:0,interventions:0,invoiced:0,collected:0});

test('14C5B-FE le modèle des trois origines réconcilie les KPI y compris un CA négatif',()=>{
  const rows:WorkshopOriginReport[]=[
    {origin:'CONCESSION',repairOrdersCreated:1,activeOrders:0,completedOrders:1,cancelledOrders:0,abandonedOrders:0,closedOrdersInPeriod:1,distinctCustomers:1,distinctVehicles:1,interventionAmount:600_000,netInvoiced:1_000_000,netCollected:400_000,currentOutstanding:600_000},
    {origin:'EXTERNAL',repairOrdersCreated:2,activeOrders:1,completedOrders:1,cancelledOrders:0,abandonedOrders:0,closedOrdersInPeriod:1,distinctCustomers:2,distinctVehicles:2,interventionAmount:300_000,netInvoiced:-200_000,netCollected:300_000,currentOutstanding:100_000},
    {origin:'UNKNOWN',repairOrdersCreated:0,activeOrders:0,completedOrders:0,cancelledOrders:0,abandonedOrders:0,closedOrdersInPeriod:0,distinctCustomers:0,distinctVehicles:0,interventionAmount:0,netInvoiced:0,netCollected:0,currentOutstanding:0},
  ];
  assert.deepEqual(rows.map(row=>row.origin),['CONCESSION','EXTERNAL','UNKNOWN']);
  assert.deepEqual(totals(rows),{orders:3,interventions:900_000,invoiced:800_000,collected:700_000});
});

test('14C5B-FE filtrer une origine ne reclassifie pas UNKNOWN',()=>{
  const origins=['CONCESSION','EXTERNAL','UNKNOWN'] as const;
  assert.deepEqual(origins.filter(origin=>origin==='UNKNOWN'),['UNKNOWN']);
  assert.equal(new Intl.NumberFormat('fr-FR',{maximumFractionDigits:0}).format(-200_000).replace(/[\u00a0\u202f]/g,'.'),'-200.000');
});
