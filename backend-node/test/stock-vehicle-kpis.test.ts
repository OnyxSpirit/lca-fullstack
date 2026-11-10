import assert from 'node:assert/strict';
import test from 'node:test';
import type {Request} from 'express';
import {COMMERCIAL_PARK_STATUSES,vehicleStatsQuery} from '../src/modules/vehicles/vehicle.routes.js';

type Scope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
const request=(view:Scope,financial?:Scope,agencyId='10')=>({
  user:{sub:'1',agencyId,roles:['DYNAMIC_STOCK'],sid:'session-1'},
  query:{},
  rbac:{roleId:'1',roleCode:'DYNAMIC_STOCK',isSuperAdmin:false,permissions:new Map([
    ['vehicles.view',view],
    ...financial?[['vehicles.financials.view',financial] as const]:[],
  ])},agencyRbac:{userId:'1',sessionId:'session-1',activeAgencyId:agencyId,contextVersion:1,isSuperAdmin:false,permissions:new Map([['vehicles.view',view],...financial?[['vehicles.financials.view',financial] as const]:[]]),assignments:[]},
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

test('STOCK-KPI-06/07/08 : le scope financier AGENCY reste borné à agence active',()=>{
  const built=vehicleStatsQuery(request('AGENCY','AGENCY'));
  assert.match(built.sql,/CASE WHEN[\s\S]*v\.agency_id=\?/);
  assert.deepEqual(built.params,['10','10']);
});

test('STOCK-KPI-09/10 : les scopes financiers historiques ne donnent aucune valeur',()=>{
  for(const scope of ['CONCESSION','GLOBAL'] as const){const built=vehicleStatsQuery(request('AGENCY',scope));assert.doesNotMatch(built.sql,/stock_value/);assert.equal(built.finance,false)}
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
  const built=vehicleStatsQuery(request('AGENCY','OWN'));assert.equal(built.finance,false);assert.doesNotMatch(built.sql,/stock_value/);
});
