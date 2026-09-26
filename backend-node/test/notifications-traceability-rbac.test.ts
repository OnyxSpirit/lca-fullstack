import assert from 'node:assert/strict';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {env} from '../src/config/env.js';
import {pool} from '../src/config/database.js';

const authToken=jwt.sign({sub:'200',email:'user@test.local',roles:['DYNAMIC_ROLE'],agencyId:'1',sid:'notification-rbac-test-session'},env.jwt.accessSecret,{expiresIn:'5m'});

test('NOTIF-RBAC-02 sépare view, update, archive et delete avec ownership et audit',async()=>{
  const originalExecute=pool.execute.bind(pool),originalGetConnection=pool.getConnection.bind(pool);
  let permissions:{code:string;scope:string}[]=[];
  let systemSuperAdmin=false;
  const statements:Array<{sql:string;params:unknown[]}>=[];
  const connection={
    beginTransaction:async()=>undefined,commit:async()=>undefined,rollback:async()=>undefined,release:()=>undefined,
    execute:async(sql:string,params:unknown[]=[])=>{
      statements.push({sql,params});
      if(sql.includes('SELECT id,archived_at')||sql.includes('SELECT id,deleted_at'))return [String(params[0])==='999'?[]:[{id:params[0],archived_at:null,deleted_at:null}],[]];
      return[{affectedRows:1},[]];
    },
  };
  try{
    (pool as any).getConnection=async()=>connection;
    (pool as any).execute=async(sql:string,params:unknown[]=[])=>{
      if(sql.includes('JOIN refresh_tokens rt'))return[[{id:'200',agency_id:'1'}],[]];
      if(sql.includes('SELECT r.id,r.code,r.is_system'))return[[{id:'10',code:systemSuperAdmin?'SUPER_ADMIN':'DYNAMIC_ROLE',is_system:systemSuperAdmin?1:0}],[]];
      if(sql.includes('SELECT p.code,rp.scope'))return[permissions,[]];
      if(sql.includes('COUNT(DISTINCT'))return[[{total:0}],[]];
      if(sql.includes('UPDATE notifications SET read_at'))return[{affectedRows:1},[]];
      if(sql.includes('WITH visible AS'))return[[],[]];
      return[[],[]];
    };
    const call=(method:'get'|'patch'|'delete',path:string)=>request(createApp())[method](path).set('Authorization',`Bearer ${authToken}`);

    permissions=[{code:'notifications.view',scope:'OWN'}];
    assert.equal((await call('get','/api/notifications')).status,200);
    assert.equal((await call('patch','/api/notifications/1/read')).status,403);
    assert.equal((await call('patch','/api/notifications/1/archive')).status,403);
    assert.equal((await call('delete','/api/notifications/1')).status,403);

    permissions=[{code:'notifications.view',scope:'OWN'},{code:'notifications.update',scope:'OWN'}];
    assert.equal((await call('patch','/api/notifications/1/read')).status,200);
    assert.equal((await call('patch','/api/notifications/1/archive')).status,403);
    assert.equal((await call('delete','/api/notifications/1')).status,403);

    permissions=[{code:'notifications.archive',scope:'OWN'}];
    assert.equal((await call('patch','/api/notifications/1/archive')).status,200);
    assert.equal((await call('patch','/api/notifications/999/archive')).status,404);

    permissions=[{code:'notifications.delete',scope:'GLOBAL'}];
    assert.equal((await call('delete','/api/notifications/1')).status,200);
    assert.equal((await call('delete','/api/notifications/999')).status,404);
    assert.ok(statements.some(x=>x.sql.includes('SET archived_at=NOW(),archived_by=?')));
    assert.ok(statements.some(x=>x.sql.includes('SET deleted_at=NOW(),deleted_by=?')));
    assert.ok(statements.some(x=>x.sql.includes("'notification.archived'")));
    assert.ok(statements.some(x=>x.sql.includes("'notification.deleted'")));
    assert.ok(statements.filter(x=>x.sql.includes('SELECT id,')).every(x=>x.sql.includes('user_id=?')));
    assert.ok(statements.every(x=>!x.sql.includes('DELETE FROM notifications')));

    permissions=[];systemSuperAdmin=true;
    assert.equal((await call('patch','/api/notifications/2/archive')).status,200);
  }finally{
    (pool as any).execute=originalExecute;
    (pool as any).getConnection=originalGetConnection;
  }
});
