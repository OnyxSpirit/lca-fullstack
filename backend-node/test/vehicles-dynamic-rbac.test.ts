import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { Request } from 'express';
import { assertPermission } from '../src/modules/rbac/rbac.service.js';
import { assertManualVehicleTransition, vehicleScope } from '../src/modules/vehicles/vehicle.routes.js';

const request=(permissions:Record<string,'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL'>={},options:{superAdmin?:boolean;agencyId?:string}={})=>({
  user:{sub:'77',email:'dynamic@lca.local',roles:['VEHICLE_OPERATOR_DYNAMIC'],agencyId:options.agencyId??'10'},
  query:{},
  rbac:{roleId:'900',roleCode:'VEHICLE_OPERATOR_DYNAMIC',isSuperAdmin:Boolean(options.superAdmin),permissions:new Map(Object.entries(permissions))},
}) as unknown as Request;
const source=readFileSync(new URL('../src/modules/vehicles/vehicle.routes.ts',import.meta.url),'utf8');
const imageStorage=readFileSync(new URL('../src/modules/vehicles/vehicle-image-storage.ts',import.meta.url),'utf8');
const migration=readFileSync(new URL('../database/legacy-migrations/026_vehicles_dynamic_permissions.sql',import.meta.url),'utf8');
const sales=readFileSync(new URL('../src/modules/sales/sale.service.ts',import.meta.url),'utf8');

test('VEH-01/06/08/10/15/21 : une permission absente est refusée, sans bypass de rôle',async()=>{
  for(const permission of ['vehicles.view','vehicles.create','vehicles.update','vehicles.status.update'])await assert.rejects(()=>assertPermission(request(),permission),(error:any)=>error.status===403);
  await assert.rejects(()=>assertPermission(request({},{}),'vehicles.view'));
  assert.doesNotMatch(source,/authorize\(|roles\.includes|roles\.some|DIRECTOR|SALES_MANAGER|WAREHOUSE_CLERK/);
});

test('VEH-02/03/04/13 : les clauses SQL suivent strictement AGENCY, CONCESSION et GLOBAL',()=>{
  assert.deepEqual(vehicleScope(request({'vehicles.view':'AGENCY'}),'vehicles.view'),{sql:'v.agency_id=?',params:['10']});
  const concession=vehicleScope(request({'vehicles.view':'CONCESSION'}),'vehicles.view');
  assert.match(concession.sql,/concession_id/); assert.deepEqual(concession.params,['10']);
  assert.deepEqual(vehicleScope(request({'vehicles.view':'GLOBAL'}),'vehicles.view'),{sql:'1=1',params:[]});
  assert.match(source,/WHERE v\.archived_at IS NULL AND \$\{scoped\.sql\}/);
});

test('VEH-05 : OWN est explicitement refusé car un véhicule appartient au stock agence',()=>{
  assert.throws(()=>vehicleScope(request({'vehicles.view':'OWN'}),'vehicles.view'),(error:any)=>error.status===403&&/OWN/.test(error.message));
});

test('VEH-07/09 : création et modification calculent leur propre scope et non vehicles.view',()=>{
  assert.match(source,/agency\(request,'vehicles\.create',request\.body\.agencyId\)/);
  assert.match(source,/accessible\(id,request,'vehicles\.update'\)/);
  assert.match(source,/assertAgencyPermissionScope\(request,permission,target\)/);
  assert.match(source,/scoped==='OWN'.*scope OWN ne s’applique pas au stock véhicules/);
});

test('VEH-11/12 : seules les transitions manuelles autorisées passent',()=>{
  assert.doesNotThrow(()=>assertManualVehicleTransition('received','preparation'));
  assert.throws(()=>assertManualVehicleTransition('received','sold'));
  assert.throws(()=>assertManualVehicleTransition('sold','available'));
  assert.throws(()=>assertManualVehicleTransition('available','reserved'));
});

test('VEH-14/16 : rôle inconnu autorisé par permission et SUPER_ADMIN système global',async()=>{
  assert.equal(await assertPermission(request({'vehicles.view':'AGENCY'}),'vehicles.view'),'AGENCY');
  assert.equal(await assertPermission(request({}, {superAdmin:true}),'vehicles.view'),'GLOBAL');
});

test('VEH-22/23 : la chaîne upload persiste une URL /uploads exploitable',()=>{
  assert.match(imageStorage,/writeFile\(item\.stagingPath,buffer,\{flag:'wx'\}\)/);
  assert.match(imageStorage,/publicPath:`\/uploads\/vehicles\/\$\{fileName\}`/);
  assert.match(imageStorage,/await fs\.link\(file\.stagingPath,file\.finalPath\)/);
  const app=readFileSync(new URL('../src/app.ts',import.meta.url),'utf8');
  const nginx=readFileSync(new URL('../../frontend/nginx/default.conf',import.meta.url),'utf8');
  const compose=readFileSync(new URL('../../docker-compose.yml',import.meta.url),'utf8');
  assert.match(app,/\/uploads/); assert.match(nginx,/location \^~ \/uploads\//); assert.match(compose,/uploads_data/);
});

test('VEH-24 : la vente verrouille le véhicule et exige available',()=>{
  assert.match(sales,/FOR UPDATE/); assert.match(sales,/vehicle\.status!=='available'/);
});

test('le catalogue SQL contient toutes les permissions dynamiques Véhicules',()=>{
  for(const permission of ['vehicles.create','vehicles.update','vehicles.status.update','vehicles.images.manage','vehicles.assign_agency','vehicles.archive','vehicles.financials.view'])assert.match(migration,new RegExp(permission.replaceAll('.','\\.')));
});
