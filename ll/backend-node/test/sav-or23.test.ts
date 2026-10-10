import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { workStartedFromEvidence } from '../src/modules/workshop/work-start-state.js';

const [route,workStart] = await Promise.all([
  readFile(new URL('../src/modules/workshop/workshop.routes.ts', import.meta.url), 'utf8'),
  readFile(new URL('../src/modules/workshop/work-start-state.ts', import.meta.url), 'utf8'),
]);

test('SAV-OR-23 définit le début effectif par une preuve d’exécution persistante', () => {
  assert.match(workStart, /work_sessions WHERE repair_order_id=\? AND started_at IS NOT NULL/);
  assert.doesNotMatch(route, /work_started[^\n]+time_entries|assertWorkNotStarted[\s\S]{0,500}time_entries/);
  assert.doesNotMatch(route, /assertWorkNotStarted[\s\S]{0,500}(?:schedules|technician_id|interventions)/);
  assert.match(route, /workStarted=workStartedFromEvidence\(\{startedSessionCount:workStartedRows\[0\]\?\.started_session_count\}\)/);
});

test('SAV-OR-23 protège annulation, demande et finalisation d’abandon', () => {
  const checks = route.match(/await assertWorkNotStarted\(c,id\)/g) ?? [];
  assert.equal(checks.length, 4);
  assert.match(route, /post\('\/repair-orders\/:id\/abandonment'/);
  assert.match(route, /post\('\/repair-orders\/:id\/abandonment\/finalize'/);
  assert.match(route, /if\(next==='cancelled'\)await assertWorkNotStarted\(c,id\)/);
  assert.match(route, /HttpError\(409,"Cette action n'est plus disponible car les travaux ont déjà commencé\."\)/);
});

test('SAV-OR-23 sérialise le verrou avec le démarrage de session', () => {
  assert.match(route, /SELECT \* FROM repair_orders WHERE id=\? FOR UPDATE/);
  assert.match(route, /SELECT status FROM repair_orders WHERE id=\? FOR UPDATE[^\n]+status!=='in_progress'/);
  assert.match(route, /INSERT INTO work_sessions\(repair_order_id,technician_id,intervention_id,bay_id,started_at,status,created_by\)/);
  assert.doesNotMatch(route, /isSuperAdmin[^\n]+assertWorkNotStarted|GLOBAL[^\n]+assertWorkNotStarted/);
});

test('SAV-OR-23 conserve l’isolation par identifiant d’OR et les cas avant travaux', () => {
  assert.match(route, /assertWorkNotStarted\(connection:PoolConnection,repairOrderId:string\)/);
  assert.match(route, /work_sessions WHERE repair_order_id=\?/);
  assert.match(route, /\[repairOrderId\]/);
  assert.match(route, /\['planned','received','diagnosis','waiting_approval','in_progress','quality_control','ready','invoiced'\]/);
});

test('SAV-OR-23 planification, temps orphelin et préparation ne valent pas démarrage',()=>{
  assert.equal(workStartedFromEvidence({startedSessionCount:0}),false);
  assert.equal(workStartedFromEvidence({startedSessionCount:1}),true);
});
