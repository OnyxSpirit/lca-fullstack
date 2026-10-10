import assert from 'node:assert/strict';
import {beforeEach,test} from 'node:test';
import jwt from 'jsonwebtoken';
import {env} from '../src/config/env.js';
import {authenticate} from '../src/middleware/authenticate.js';
import {assertPermission} from '../src/modules/rbac/rbac.service.js';
import {clearTestAuthSessions,issueTestAccessToken,revokeTestSession} from './helpers/auth-session-fixture.js';

const run=async(token:string)=>{
  const request={headers:{authorization:`Bearer ${token}`}}as any;let error:any;
  await authenticate(request,{}as any,(value?:unknown)=>{error=value});
  return{request,error};
};

beforeEach(clearTestAuthSessions);

test('JWT-01 session active authentifie puis charge uniquement la permission demandée',async()=>{
  const token=issueTestAccessToken({userId:'jwt-1',agencyId:'1',permissions:[{code:'crm.prospect.view',scope:'AGENCY'}],mockRbac:true});
  const{request,error}=await run(token);assert.equal(error,undefined);assert.equal(request.user.sub,'jwt-1');assert.equal(await assertPermission(request,'crm.prospect.view'),'AGENCY');
});
test('JWT-02 token valide sans session persistée est rejeté',async()=>{assert.equal((await run(issueTestAccessToken({userId:'jwt-2',sessionState:'ABSENT'}))).error?.status,401)});
test('JWT-03 session révoquée est rejetée',async()=>{assert.equal((await run(issueTestAccessToken({userId:'jwt-3',sessionState:'REVOKED'}))).error?.status,401)});
test('JWT-04 session expirée est rejetée',async()=>{assert.equal((await run(issueTestAccessToken({userId:'jwt-4',sessionState:'EXPIRED'}))).error?.status,401)});
test('JWT-05 JWT expiré malgré une session active est rejeté',async()=>{assert.equal((await run(issueTestAccessToken({userId:'jwt-5',expiresIn:-1}))).error?.status,401)});
test('JWT-06 signature invalide est rejetée',async()=>{assert.equal((await run(issueTestAccessToken({userId:'jwt-6',secret:'signature-invalide-de-test-000000'}))).error?.status,401)});
test('JWT-07 sid appartenant à un autre utilisateur est rejeté',async()=>{const owner=issueTestAccessToken({userId:'jwt-7a'}),claims=jwt.decode(owner)as{sid:string};const forged=jwt.sign({sub:'jwt-7b',sid:claims.sid},env.jwt.accessSecret,{algorithm:'HS256',expiresIn:'5m'});assert.equal((await run(forged)).error?.status,401)});
test('JWT-08 utilisateur authentifié sans permission atteint RBAC et reçoit 403',async()=>{const{request,error}=await run(issueTestAccessToken({userId:'jwt-8',permissions:[],mockRbac:true}));assert.equal(error,undefined);await assert.rejects(()=>assertPermission(request,'billing.payment.collect'),(value:any)=>value.status===403)});
test('JWT-09 le scope AGENCY reste borné et n’est jamais promu GLOBAL',async()=>{const{request}=await run(issueTestAccessToken({userId:'jwt-9',agencyId:'1',permissions:[{code:'customers.view',scope:'AGENCY'}],mockRbac:true}));assert.equal(await assertPermission(request,'customers.view'),'AGENCY');assert.notEqual(request.rbac.permissions.get('customers.view'),'GLOBAL')});
test('JWT-10 révoquer après émission invalide immédiatement le JWT',async()=>{const token=issueTestAccessToken({userId:'jwt-10',permissions:[],mockRbac:true});assert.equal((await run(token)).error,undefined);revokeTestSession(token);assert.equal((await run(token)).error?.status,401)});
