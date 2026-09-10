import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {assertTestDriveReturned} from '../src/modules/quotations/quotation.service.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const row=(status:string|null,returnedAt:string|null)=>({test_drive_status:status,test_drive_returned_at:returnedAt}) as any;

test('TEST-DRIVE-01/02 un essai démarré reste en cours et bloque le devis avec une erreur métier',()=>{
  const showroom=read('../src/modules/showroom/showroom.routes.ts');
  assert.match(showroom,/status,started_at,created_by\) VALUES[\s\S]*'in_progress',NOW\(\)/);
  assert.throws(()=>assertTestDriveReturned(row('in_progress',null)),error=>Boolean(error&&typeof error==='object'&&'status'in error&&(error as any).status===409&&/retour du véhicule doit être enregistré/.test((error as Error).message)));
});

test('TEST-DRIVE-04/05 un retour completed daté débloque le prérequis devis',()=>{
  assert.doesNotThrow(()=>assertTestDriveReturned(row('completed','2026-09-10T12:00:00.000Z')));
  const showroom=read('../src/modules/showroom/showroom.routes.ts'),crm=read('../src/modules/crm/crm.routes.ts');
  assert.match(showroom,/status='completed',mileage_in=\?,returned_at=NOW\(\)/);
  assert.match(showroom,/Retour essai routier confirmé/);
  assert.match(crm,/canCreateQuotation:row\.stage==='test_drive'&&row\.test_drive_status==='completed'/);
});

test('TEST-DRIVE-06 aucun essai terminé ne permet de créer un devis',()=>{
  assert.throws(()=>assertTestDriveReturned(row(null,null)),/retour du véhicule doit être enregistré/);
  const service=read('../src/modules/quotations/quotation.service.ts');
  assert.match(service,/assertTestDriveReturned\(opportunity\)/);
  assert.match(service,/td\.status<>'cancelled'/);
});

test('TEST-DRIVE-07 un véhicule vendu reste refusé au lancement',()=>{
  const showroom=read('../src/modules/showroom/showroom.routes.ts');
  assert.match(showroom,/vehicle\.status!=='available'/);
  assert.match(showroom,/Véhicule indisponible pour un essai/);
});

test('TEST-DRIVE-08 le commercial simple ne peut pas confirmer lui-même le retour physique',async()=>{
  const token=jwt.sign({sub:'10',email:'commercial@test.local',roles:['SALES_AGENT'],agencyId:'1'},env.jwt.accessSecret,{expiresIn:'5m'});
  const response=await request(createApp()).patch('/api/showroom/test-drives/1/complete').set('Authorization',`Bearer ${token}`).send({mileageIn:10});
  assert.equal(response.status,403);
});

test('la finalisation du retour et la création du devis revérifient leur état sous transaction',()=>{
  const showroom=read('../src/modules/showroom/showroom.routes.ts'),quotation=read('../src/modules/quotations/quotation.service.ts');
  assert.match(showroom,/showroom_test_drives[\s\S]*FOR UPDATE/);
  assert.match(quotation,/WHERE o\.id=\? FOR UPDATE/);
  assert.match(quotation,/assertTestDriveReturned\(opportunity\)/);
});
