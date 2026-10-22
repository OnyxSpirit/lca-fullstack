import assert from'node:assert/strict';
import test from'node:test';
import{testDriveTiming}from'../src/modules/showroom/showroomPolicy.ts';

test('distingue durée prévue, écoulée et réelle avant la fin prévue',()=>{
  const timing=testDriveTiming({scheduledAt:'2026-10-23 09:00:00',startedAt:'2026-10-23 09:00:00',durationMinutes:30},new Date('2026-10-23T09:12:00.000Z'));
  assert.equal(timing.plannedEnd?.toISOString(),'2026-10-23T09:30:00.000Z');
  assert.equal(timing.elapsedMinutes,12);
  assert.equal(timing.actualDurationMinutes,null);
});

test('calcule la durée réelle avec l’heure de retour, même après la fin prévue',()=>{
  const timing=testDriveTiming({scheduledAt:'2026-10-23 09:00:00',startedAt:'2026-10-23 09:00:00',returnedAt:'2026-10-23 09:45:00',durationMinutes:30},new Date('2026-10-23T10:00:00.000Z'));
  assert.equal(timing.elapsedMinutes,45);
  assert.equal(timing.actualDurationMinutes,45);
});

test('gère un essai proche de minuit selon les instants UTC normalisés',()=>{
  const timing=testDriveTiming({scheduledAt:'2026-10-22 23:55:00',startedAt:'2026-10-22 23:58:00',returnedAt:'2026-10-23 00:10:00',durationMinutes:30});
  assert.equal(timing.plannedEnd?.toISOString(),'2026-10-23T00:25:00.000Z');
  assert.equal(timing.actualDurationMinutes,12);
});

test('ne produit pas de durée négative en cas d’horloge incohérente',()=>{
  assert.equal(testDriveTiming({startedAt:'2026-10-23 09:00:00'},new Date('2026-10-23T08:59:00.000Z')).elapsedMinutes,0);
});
