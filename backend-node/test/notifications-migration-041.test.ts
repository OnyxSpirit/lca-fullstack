import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';

const sql=readFileSync(new URL('../database/migrations/041_notifications_traceability_rbac.sql',import.meta.url),'utf8');

test('migration 041 ajoute une traçabilité nullable sans cascade destructive',()=>{
  for(const column of ['archived_at','archived_by','deleted_at','deleted_by'])assert.match(sql,new RegExp(`ADD COLUMN ${column} `));
  for(const permission of ['notifications.update','notifications.archive','notifications.delete'])assert.match(sql,new RegExp(permission.replace('.','\\.')));
  assert.doesNotMatch(sql,/DROP\s|ON DELETE CASCADE/i);
  assert.match(sql,/ON DELETE SET NULL/g);
});
