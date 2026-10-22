import assert from 'node:assert/strict';
import test from 'node:test';
import {formatDateTime} from '../src/lib/utils.ts';

test('les datetimes MySQL UTC sont affichés dans le fuseau métier',()=>{
  const rendered=formatDateTime('2026-10-23 09:30:00');
  assert.match(rendered,/10:30/);
  assert.doesNotMatch(rendered,/09:30/);
});

test('un instant ISO UTC ne subit pas de double conversion',()=>{
  assert.match(formatDateTime('2026-10-23T09:30:00.000Z'),/10:30/);
});
