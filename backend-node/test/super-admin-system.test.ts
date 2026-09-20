import assert from 'node:assert/strict';
import test from 'node:test';
import { pool } from '../src/config/database.js';
import { resolveRbacContext, can } from '../src/modules/rbac/rbac.service.js';

test('le résolveur refuse le bypass à SUPER_ADMIN non système',async()=>{
  const original=pool.execute;
  try {
    for(const isSystem of [0,1]) {
      (pool as any).execute=async(sql:string)=>sql.includes('FROM users u')
        ? [[{id:1,code:'SUPER_ADMIN',is_system:isSystem}],[]] : [[],[]];
      const context=await resolveRbacContext('1');
      assert.equal(context.isSuperAdmin,isSystem===1);
      assert.equal(can(context,'roles.create'),isSystem===1);
    }
  } finally { pool.execute=original; }
});
