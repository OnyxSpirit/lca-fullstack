import assert from 'node:assert/strict';
import test from 'node:test';
import type {PoolConnection} from 'mysql2/promise';
import {assertTestDriveStartAvailable} from '../src/modules/showroom/showroom-test-drive.js';

type Row=Record<string,unknown>;
const connection=(active:Row[]=[],appointments:Row[]=[])=>({execute:async(sql:string)=>{
  if(sql.startsWith('SELECT id,mileage,status'))return[[{id:1,mileage:100,status:'available',agency_id:1,is_commercial_stock:1,archived_at:null}],[]];
  if(sql.startsWith('SELECT id FROM users'))return[[{id:2}],[]];
  if(sql.includes('FROM showroom_test_drives WHERE vehicle_id='))return[active.filter(row=>String(row.vehicle_id)==='1'),[]];
  if(sql.includes('FROM showroom_test_drives WHERE advisor_id='))return[active.filter(row=>String(row.advisor_id)==='2'),[]];
  if(sql.includes('FROM showroom_test_drives WHERE visit_id='))return[active.filter(row=>String(row.visit_id)==='3'),[]];
  if(sql.includes('FROM follow_ups'))return[appointments,[]];
  return[[{id:3}],[]];
}} as unknown as PoolConnection);

test('CORR-ERP-02D refuse séparément véhicule, commercial, visite et rendez-vous actifs',async()=>{
  const base={vehicleId:'1',advisorId:'2',agencyId:'1',visitId:'3'};
  await assert.rejects(()=>assertTestDriveStartAvailable(connection([{vehicle_id:1,advisor_id:9,visit_id:8}]),base),(error:any)=>error.details?.code==='TEST_DRIVE_VEHICLE_CONFLICT');
  await assert.rejects(()=>assertTestDriveStartAvailable(connection([{vehicle_id:9,advisor_id:2,visit_id:8}]),base),(error:any)=>error.details?.code==='TEST_DRIVE_ADVISOR_CONFLICT');
  await assert.rejects(()=>assertTestDriveStartAvailable(connection([{vehicle_id:9,advisor_id:8,visit_id:3}]),base),(error:any)=>error.details?.code==='TEST_DRIVE_VISIT_CONFLICT');
  await assert.rejects(()=>assertTestDriveStartAvailable(connection([],[{id:4}]),base),(error:any)=>error.details?.code==='TEST_DRIVE_APPOINTMENT_CONFLICT');
});

test('CORR-ERP-02D accepte des ressources indépendantes disponibles',async()=>{
  const vehicle=await assertTestDriveStartAvailable(connection(),{vehicleId:'1',advisorId:'2',agencyId:'1',visitId:'3'});
  assert.equal(String(vehicle.id),'1');
});
