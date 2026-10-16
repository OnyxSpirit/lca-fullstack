import assert from'node:assert/strict';
import{mock,test}from'node:test';
import argon2 from'argon2';
import type{ResultSetHeader,RowDataPacket}from'mysql2/promise';

const password='step-up-password',passwordHash=await argon2.hash(password),sessions=new Map<string,{userId:string;strongAt:number|null;revoked:boolean}>();
const result=(affectedRows=1)=>({affectedRows}as ResultSetHeader);
async function query<T extends RowDataPacket[]>(sql:string,params:unknown[]=[]):Promise<T>{
 if(sql.includes('strong_auth_at>=DATE_SUB')){const session=sessions.get(String(params[0])),minimum=Date.now()-Number(params[2])*1000;return(session&&session.userId===String(params[1])&&!session.revoked&&session.strongAt!=null&&session.strongAt>=minimum?[{id:params[0]}]:[])as T}
 if(sql.includes('SELECT password_hash FROM users'))return(String(params[0])==='1'?[{password_hash:passwordHash}]:[])as T;
 if(sql.includes("r.code='SUPER_ADMIN'")&&sql.includes('role_two_factor_policies'))return[{super_admin:0,individually_required:0,role_required:0,enabled_at:null,reset_required:0}]as T;
 throw new Error(`Requête non gérée: ${sql}`);
}
async function execute(sql:string,params:unknown[]=[]):Promise<any>{
 if(sql.startsWith('UPDATE refresh_tokens SET strong_auth_at')){const session=sessions.get(String(params[1]));if(!session||session.userId!==String(params[2])||session.revoked)return[result(0),[]];session.strongAt=Date.now();return[result(),[]]}
 if(sql.startsWith('SELECT u.agency_id'))return[[{agency_id:'10',concession_id:'20'}],[]];
 if(sql.startsWith('INSERT INTO audit_logs'))return[result(),[]];
 throw new Error(`Écriture non gérée: ${sql}`);
}
async function transaction<T>(work:(connection:{execute:typeof execute})=>Promise<T>){return work({execute})}
mock.module('../src/config/database.js',{namedExports:{query,transaction,execute:async()=>result()}});
mock.module('../src/modules/notifications/notification.service.js',{namedExports:{createUserNotification:async()=>null}});
const service=await import('../src/modules/auth/two-factor.service.js');
const request=(sid:string)=>({user:{sub:'1',sid,email:'actor@example.test',roles:[],agencyId:'10'},ip:'127.0.0.1',get:()=> 'test-agent'}as any);

test('STEP-01/02/03: immédiat, 9 min 59 s et expiration stricte au-delà de dix minutes',async()=>{
 sessions.set('fresh',{userId:'1',strongAt:Date.now(),revoked:false});
 sessions.set('edge',{userId:'1',strongAt:Date.now()-599_000,revoked:false});
 sessions.set('expired',{userId:'1',strongAt:Date.now()-601_000,revoked:false});
 await service.assertRecentStrongAuthentication(request('fresh'));
 await service.assertRecentStrongAuthentication(request('edge'));
 await assert.rejects(service.assertRecentStrongAuthentication(request('expired')),(error:any)=>error.status===401&&error.details?.code==='STRONG_AUTH_REQUIRED');
});

test('STEP-04/05: un step-up expiré réussit avec le bon mot de passe et refuse le mauvais',async()=>{
 sessions.set('current',{userId:'1',strongAt:null,revoked:false});
 await assert.rejects(service.stepUp(request('current'),'incorrect',undefined),(error:any)=>error.status===401);
 assert.equal(sessions.get('current')?.strongAt,null);
 const response=await service.stepUp(request('current'),password,undefined);
 assert.equal(response.method,'PASSWORD');
 await service.assertRecentStrongAuthentication(request('current'));
});

test('STEP-06/07: session révoquée refusée et deux sessions restent strictement isolées',async()=>{
 sessions.set('revoked',{userId:'1',strongAt:null,revoked:true});
 await assert.rejects(service.stepUp(request('revoked'),password,undefined),(error:any)=>error.status===401);
 sessions.set('a',{userId:'1',strongAt:null,revoked:false});sessions.set('b',{userId:'1',strongAt:null,revoked:false});
 await service.stepUp(request('a'),password,undefined);
 assert.ok(sessions.get('a')?.strongAt);
 assert.equal(sessions.get('b')?.strongAt,null);
 await assert.rejects(service.assertRecentStrongAuthentication(request('b')),(error:any)=>error.details?.code==='STRONG_AUTH_REQUIRED');
});
