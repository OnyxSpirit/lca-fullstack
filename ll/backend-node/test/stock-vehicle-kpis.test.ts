import assert from 'node:assert/strict';
import test from 'node:test';
import type {Request} from 'express';
import {COMMERCIAL_PARK_STATUSES,vehicleStatsQuery} from '../src/modules/vehicles/vehicle.routes.js';

type Scope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
const request=(view:Scope,financial?:Scope,agencyId='10')=>({
  user:{sub:'1',agencyId,roles:['DYNAMIC_STOCK']},
  query:{},
  rbac:{roleId:'1',roleCode:'DYNAMIC_STOCK',isSuperAdmin:false,permissions:new Map([
    ['vehicles.view',view],
    ...financial?[['vehicles.financials.view',financial] as const]:[],
  ])},
}) as unknown as Request;

const aggregate=(rows:Array<{status:string;salePrice:number;type?:string}>)=>({
  availableForSale:rows.filter(row=>row.status==='available').length,
  stockValue:rows.filter(row=>COMMERCIAL_PARK_STATUSES.includes(row.status as typeof COMMERCIAL_PARK_STATUSES[number])).reduce((total,row)=>total+row.salePrice,0),
});

test('STOCK-KPI-01/02 : sold est exclu de la disponibilité et de la valeur du parc',()=>{
  assert.deepEqual(aggregate([
    {status:'available',salePrice:35_000_000},{status:'available',salePrice:40_000_000},
    {status:'sold',salePrice:50_000_000},{status:'sold',salePrice:35_000_000},
  ]),{availableForSale:2,stockValue:75_000_000});
});

test('STOCK-KPI-03/04 : reserved reste valorisé et seuls les quatre statuts du parc commercial sont inclus',()=>{
  assert.deepEqual(aggregate([
    {status:'available',salePrice:35_000_000},{status:'reserved',salePrice:30_000_000},
    {status:'sold',salePrice:50_000_000},{status:'delivered',salePrice:40_000_000},
  ]),{availableForSale:1,stockValue:65_000_000});
  assert.deepEqual(aggregate([
    {status:'received',salePrice:25_000_000},{status:'preparation',salePrice:30_000_000},
    {status:'available',salePrice:35_000_000},{status:'reserved',salePrice:40_000_000},
    {status:'ordered',salePrice:45_000_000},{status:'in_transit',salePrice:50_000_000},
    {status:'sold',salePrice:55_000_000},{status:'delivered',salePrice:60_000_000},
  ]),{availableForSale:1,stockValue:130_000_000});
});

test('STOCK-KPI-06/07/08 : le scope financier AGENCY borne AGENCY, CONCESSION et GLOBAL',()=>{
  for(const view of ['AGENCY','CONCESSION','GLOBAL'] as const){
    const built=vehicleStatsQuery(request(view,'AGENCY'));
    assert.match(built.sql,/CASE WHEN[\s\S]*v\.agency_id=\?/);
    assert.equal(built.params[0],'10');
  }
});

test('STOCK-KPI-09/10 : les scopes financiers CONCESSION et GLOBAL restent indépendants du scope de lecture',()=>{
  const concession=vehicleStatsQuery(request('GLOBAL','CONCESSION'));
  assert.match(concession.sql,/CASE WHEN[\s\S]*concession_id/);
  assert.deepEqual(concession.params,['10']);
  const global=vehicleStatsQuery(request('GLOBAL','GLOBAL'));
  assert.match(global.sql,/CASE WHEN[\s\S]*AND \(1=1\)/);
  assert.deepEqual(global.params,[]);
});

test('STOCK-KPI-11 : VN et VO suivent exactement la même règle fondée sur le statut',()=>{
  assert.deepEqual(aggregate([
    {type:'new',status:'available',salePrice:20_000_000},
    {type:'used',status:'available',salePrice:15_000_000},
    {type:'new',status:'sold',salePrice:30_000_000},
    {type:'used',status:'sold',salePrice:10_000_000},
  ]),{availableForSale:2,stockValue:35_000_000});
});

test('un scope financier OWN reste refusé pour le stock véhicules',()=>{
  assert.throws(()=>vehicleStatsQuery(request('GLOBAL','OWN')),(error:any)=>error.status===403&&/OWN/.test(error.message));
});
