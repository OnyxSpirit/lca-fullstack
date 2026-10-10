import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {PoolConnection} from 'mysql2/promise';
import {completeCrmShowroomVisit} from '../src/modules/showroom/showroom.routes.js';

const read=(path:string)=>readFileSync(new URL(path,import.meta.url),'utf8');
const routes=read('../src/modules/showroom/showroom.routes.ts');
const migration=read('../database/migrations/052_showroom_visit_origin.sql');
const baseline=read('../database/baseline/001_initial_schema.sql');

test('ORIGIN-01..05 origine explicite, déterministe et sans heuristique',()=>{
  for(const source of[migration,baseline]){
    assert.match(source,/origin ENUM\('showroom','crm'\) NOT NULL DEFAULT 'showroom'/);
    assert.match(source,/crm_test_drive/);
  }
  assert.match(routes,/INSERT INTO showroom_visits[^;]+VALUES\(\?,\?,'showroom'/);
  assert.match(routes,/INSERT INTO showroom_visits[^;]+VALUES\(\?,\?,'crm'/);
  assert.doesNotMatch(routes,/lead_id\s+IS\s+NOT\s+NULL[^;]+origin/i);
  assert.doesNotMatch(routes,/status\s*=\s*['"]in_progress['"][^;]+origin/i);
});

test('SHOWROOM-01/05 et CRM-01/10 clôturent uniquement une origine CRM',async()=>{
  const statements:Array<{sql:string;params:unknown[]}>=[];
  const connection={execute:async(sql:string,params:unknown[]=[])=>{statements.push({sql,params});return[{affectedRows:1},[]]}} as unknown as PoolConnection;
  assert.equal(await completeCrmShowroomVisit(connection,'10','showroom'),false);
  assert.equal(statements.length,0);
  assert.equal(await completeCrmShowroomVisit(connection,'20','crm'),true);
  assert.equal(statements.length,1);
  assert.match(statements[0]!.sql,/status='completed'/);
  assert.match(statements[0]!.sql,/outcome='crm_test_drive'/);
  assert.match(statements[0]!.sql,/completed_at=COALESCE\(completed_at,NOW\(\)\)/);
  assert.deepEqual(statements[0]!.params,['20']);
  assert.match(routes,/if\(visit\.origin==='crm'\)throw new HttpError\(409/);
});

test('TX-01..04 retour, activité CRM et clôture partagent la transaction existante',()=>{
  const start=routes.indexOf("patch('/showroom/test-drives/:id/complete'");
  const end=routes.indexOf("post('/showroom/:id/convert-to-lead'",start);
  const handler=routes.slice(start,end);
  assert.match(handler,/transaction\(async connection=>/);
  assert.match(handler,/status='completed',mileage_in=\?,returned_at=NOW\(\)/);
  assert.match(handler,/UPDATE vehicles SET mileage=GREATEST/);
  assert.match(handler,/INSERT INTO activities/);
  assert.match(handler,/completeCrmShowroomVisit\(connection/);
  assert.ok(handler.indexOf('mileage<Number(row.mileage_out)')<handler.indexOf("UPDATE showroom_test_drives SET status='completed'"));
  assert.match(handler,/row\.status!=='in_progress'/);
});

test('HIST-01..03 migration additive et conservatrice',()=>{
  assert.doesNotMatch(migration,/UPDATE\s+showroom_visits/i);
  assert.doesNotMatch(migration,/lead_id\s+IS\s+NOT\s+NULL/i);
  assert.doesNotMatch(migration,/DROP|DELETE|TRUNCATE/i);
});

test('RBAC-01..03 permission et scopes existants restent autoritaires',()=>{
  assert.match(routes,/test-drives\/:id\/complete',requirePermission\('showroom\.status\.update'\)/);
  assert.match(routes,/driveScope\(request,'showroom\.status\.update'\)/);
  for(const level of['GLOBAL','CONCESSION','AGENCY','OWN'])assert.match(routes,new RegExp(`level==='${level}'`));
});
