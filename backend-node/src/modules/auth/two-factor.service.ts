import argon2 from 'argon2';
import { randomBytes, randomUUID } from 'node:crypto';
import type { Request } from 'express';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { generateSecret, generateURI, verify } from 'otplib';
import type { VerifyResult as TotpVerifyResult } from '@otplib/totp';
import QRCode from 'qrcode';
import { env } from '../../config/env.js';
import { query, transaction } from '../../config/database.js';
import { HttpError } from '../../shared/http-error.js';
import { writeAudit } from '../activity/audit-writer.js';
import { createUserNotification } from '../notifications/notification.service.js';
import { contextHash, decryptSecret, encryptSecret, hashRecoveryCode, type EncryptedSecret } from './two-factor-crypto.js';

type ChallengePurpose='LOGIN_VERIFY'|'LOGIN_SETUP';
interface FactorRow extends RowDataPacket{user_id:string;encrypted_secret:string|null;secret_iv:string|null;secret_tag:string|null;secret_key_version:string|null;pending_encrypted_secret:string|null;pending_secret_iv:string|null;pending_secret_tag:string|null;pending_key_version:string|null;pending_expires_at:string|null;enabled_at:string|null;individually_required:number;reset_required:number;last_accepted_time_step:string|null}
interface ChallengeRow extends RowDataPacket{id:string;user_id:string;purpose:ChallengePurpose;context_hash:string;attempts:number;blocked_until:string|null;expires_at:string;consumed_at:string|null}

const nowSql=()=>new Date().toISOString().slice(0,19).replace('T',' ');
const code=(value:unknown)=>{const token=String(value??'').replace(/\s/g,'');if(!/^\d{6}$/.test(token))throw new HttpError(400,'Code à six chiffres requis.');return token};
const recovery=(value:unknown)=>{const token=String(value??'').trim().toUpperCase();if(!/^[A-F0-9]{4}(?:-[A-F0-9]{4}){4}$/.test(token))throw new HttpError(400,'Code de récupération invalide.');return token};
const encrypted=(row:FactorRow,pending=false):EncryptedSecret=>({ciphertext:String(pending?row.pending_encrypted_secret:row.encrypted_secret),iv:String(pending?row.pending_secret_iv:row.secret_iv),tag:String(pending?row.pending_secret_tag:row.secret_tag),keyVersion:String(pending?row.pending_key_version:row.secret_key_version)});
const requestForActor=(request:Request,actorId:string)=>Object.assign(Object.create(request),request,{user:request.user??{sub:actorId,email:'',roles:[],agencyId:null,sid:''}}) as Request;

async function audit(connection:PoolConnection,request:Request,actorId:string,targetId:string,action:string,newValues?:unknown){
  await writeAudit(connection,requestForActor(request,actorId),{module:'auth',entityType:'user',entityId:targetId,action,newValues});
}

export async function requirement(userId:string,connection?:PoolConnection){
  const run=async(sql:string,params:any[])=>connection?(await connection.execute<RowDataPacket[]>(sql,params))[0]:query<RowDataPacket[]>(sql,params);
  const rows=await run(`SELECT EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.is_active=TRUE AND r.is_system=TRUE AND r.code='SUPER_ADMIN') super_admin,COALESCE(tf.individually_required,FALSE) individually_required,EXISTS(SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.is_active=TRUE JOIN role_two_factor_policies p ON p.role_id=r.id AND p.required=TRUE WHERE ur.user_id=?) role_required,tf.enabled_at,COALESCE(tf.reset_required,FALSE) reset_required FROM users u LEFT JOIN user_two_factor_auth tf ON tf.user_id=u.id WHERE u.id=?`,[userId,userId,userId]);
  const row=rows[0];if(!row)throw new HttpError(404,'Utilisateur introuvable.');
  const superAdmin=Boolean(row.super_admin),individual=Boolean(row.individually_required),role=Boolean(row.role_required),enabled=Boolean(row.enabled_at)&&!Boolean(row.reset_required);
  return{required:superAdmin||individual||role,enabled,superAdmin,individual,role,resetRequired:Boolean(row.reset_required),enabledAt:row.enabled_at??null};
}

export async function createLoginChallenge(userId:string,purpose:ChallengePurpose,context:string){
  const id=randomUUID();
  await transaction(async c=>{await c.execute("UPDATE two_factor_challenges SET consumed_at=COALESCE(consumed_at,NOW()) WHERE user_id=? AND purpose IN('LOGIN_VERIFY','LOGIN_SETUP') AND consumed_at IS NULL",[userId]);await c.execute('INSERT INTO two_factor_challenges(id,user_id,purpose,context_hash,expires_at) VALUES(?,?,?,?,DATE_ADD(NOW(),INTERVAL ? SECOND))',[id,userId,purpose,context,env.twoFactor.challengeTtlSeconds])});
  return{id,expiresIn:env.twoFactor.challengeTtlSeconds};
}

async function lockedChallenge(c:PoolConnection,id:string,context:string,purpose?:ChallengePurpose){
  const[rows]=await c.execute<ChallengeRow[]>('SELECT * FROM two_factor_challenges WHERE id=? FOR UPDATE',[id]),row=rows[0];
  if(!row||row.consumed_at||new Date(row.expires_at).getTime()<=Date.now())throw new HttpError(401,'Challenge 2FA expiré ou déjà utilisé.');
  if(row.context_hash!==context)throw new HttpError(401,'Contexte du challenge 2FA invalide.');
  if(purpose&&row.purpose!==purpose)throw new HttpError(400,'Type de challenge 2FA invalide.');
  if(row.blocked_until&&new Date(row.blocked_until).getTime()>Date.now())throw new HttpError(429,'Trop de tentatives 2FA. Réessayez plus tard.');
  if(Number(row.attempts)>=env.twoFactor.maxAttempts)throw new HttpError(429,'Challenge 2FA bloqué. Recommencez la connexion.');
  return row;
}

async function failChallenge(c:PoolConnection,row:ChallengeRow,request:Request){
  const attempts=Number(row.attempts)+1,delay=Math.min(60,2**attempts);
  await c.execute('UPDATE two_factor_challenges SET attempts=?,blocked_until=DATE_ADD(NOW(),INTERVAL ? SECOND),consumed_at=IF(? >= ?,NOW(),consumed_at) WHERE id=?',[attempts,delay,attempts,env.twoFactor.maxAttempts,row.id]);
  if(attempts===env.twoFactor.maxAttempts)await audit(c,request,String(row.user_id),String(row.user_id),'auth.2fa.challenge_blocked',{purpose:row.purpose,attempts});
}

async function lockedFactor(c:PoolConnection,userId:string){
  const[rows]=await c.execute<FactorRow[]>('SELECT * FROM user_two_factor_auth WHERE user_id=? FOR UPDATE',[userId]);
  return rows[0];
}

async function verifyTotpLocked(c:PoolConnection,row:FactorRow,token:string,pending=false){
  const secret=decryptSecret(encrypted(row,pending)),last=pending?undefined:(row.last_accepted_time_step==null?undefined:Number(row.last_accepted_time_step));
  const result=await verify({strategy:'totp',secret,token,algorithm:'sha1',digits:6,period:30,epochTolerance:[30,0],afterTimeStep:last}) as TotpVerifyResult;
  return result.valid?result:null;
}

function plainRecoveryCodes(){return Array.from({length:10},()=>randomBytes(10).toString('hex').toUpperCase().match(/.{1,4}/g)!.join('-'))}
async function replaceRecoveryCodes(c:PoolConnection,userId:string){const values=plainRecoveryCodes();await c.execute('DELETE FROM two_factor_recovery_codes WHERE user_id=?',[userId]);for(const value of values)await c.execute('INSERT INTO two_factor_recovery_codes(user_id,code_hash) VALUES(?,?)',[userId,hashRecoveryCode(value)]);return values}

export async function beginSetup(userId:string,email:string){
  const secret=generateSecret(),box=encryptSecret(secret);
  await transaction(async c=>{await c.execute(`INSERT INTO user_two_factor_auth(user_id,pending_encrypted_secret,pending_secret_iv,pending_secret_tag,pending_key_version,pending_expires_at) VALUES(?,?,?,?,?,DATE_ADD(NOW(),INTERVAL ? SECOND)) ON DUPLICATE KEY UPDATE pending_encrypted_secret=VALUES(pending_encrypted_secret),pending_secret_iv=VALUES(pending_secret_iv),pending_secret_tag=VALUES(pending_secret_tag),pending_key_version=VALUES(pending_key_version),pending_expires_at=VALUES(pending_expires_at)`,[userId,box.ciphertext,box.iv,box.tag,box.keyVersion,env.twoFactor.setupTtlSeconds])});
  const uri=generateURI({issuer:env.twoFactor.issuer,label:email,secret,algorithm:'sha1',digits:6,period:30});
  return{manualKey:secret,qrCodeDataUrl:await QRCode.toDataURL(uri,{errorCorrectionLevel:'M',margin:1,width:256}),expiresIn:env.twoFactor.setupTtlSeconds};
}

export async function beginPersonalSetup(request:Request){await assertRecentSession(request);return beginSetup(request.user!.sub,request.user!.email)}

export async function beginChallengeSetup(challengeId:string,context:string){
  const user=await transaction(async c=>{const challenge=await lockedChallenge(c,challengeId,context,'LOGIN_SETUP');const[users]=await c.execute<RowDataPacket[]>('SELECT id,email FROM users WHERE id=? AND is_active=TRUE',[challenge.user_id]);if(!users[0])throw new HttpError(401,'Compte indisponible.');return{id:String(users[0].id),email:String(users[0].email)}});
  return beginSetup(user.id,user.email);
}

async function activate(c:PoolConnection,userId:string,token:string,request:Request,actorId:string,sessionId?:string){
  const factor=await lockedFactor(c,userId);
  if(!factor?.pending_encrypted_secret||!factor.pending_expires_at||new Date(factor.pending_expires_at).getTime()<=Date.now())throw new HttpError(409,'La configuration 2FA a expiré. Recommencez.');
  const result=await verifyTotpLocked(c,factor,code(token),true);if(!result)throw new HttpError(401,'Code 2FA incorrect ou expiré.');
  const recoveryCodes=await replaceRecoveryCodes(c,userId);
  await c.execute(`UPDATE user_two_factor_auth SET encrypted_secret=pending_encrypted_secret,secret_iv=pending_secret_iv,secret_tag=pending_secret_tag,secret_key_version=pending_key_version,pending_encrypted_secret=NULL,pending_secret_iv=NULL,pending_secret_tag=NULL,pending_key_version=NULL,pending_expires_at=NULL,enabled_at=NOW(),reset_required=FALSE,last_accepted_time_step=? WHERE user_id=?`,[result.timeStep,userId]);
  if(sessionId){await c.execute('UPDATE refresh_tokens SET two_factor_verified_at=NOW() WHERE id=? AND user_id=? AND revoked_at IS NULL',[sessionId,userId]);await c.execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND id<>? AND revoked_at IS NULL',[userId,sessionId])}else await c.execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL',[userId]);
  await audit(c,request,actorId,userId,'auth.2fa.enabled',{recoveryCodeCount:recoveryCodes.length});
  return recoveryCodes;
}

export async function confirmPersonalSetup(request:Request,token:unknown){
  const userId=request.user!.sub,recoveryCodes=await transaction(c=>activate(c,userId,code(token),request,userId,request.user!.sid));
  await createUserNotification({userId,subject:'Double authentification activée',message:'La double authentification a été activée sur votre compte.',eventType:'auth.2fa.enabled',referenceType:'user',referenceId:userId,eventKey:`auth.2fa.enabled:${userId}:${Date.now()}`,priority:'high'});
  return{recoveryCodes};
}

export async function confirmChallengeSetup(challengeId:string,context:string,token:unknown,request:Request){
  const outcome=await transaction(async c=>{const challenge=await lockedChallenge(c,challengeId,context,'LOGIN_SETUP');try{const recoveryCodes=await activate(c,String(challenge.user_id),code(token),request,String(challenge.user_id));await c.execute('UPDATE two_factor_challenges SET consumed_at=NOW() WHERE id=?',[challenge.id]);return{ok:true as const,userId:String(challenge.user_id),recoveryCodes}}catch(error){if(error instanceof HttpError&&error.status===401){await failChallenge(c,challenge,request);return{ok:false as const,message:error.message}}throw error}});if(!outcome.ok)throw new HttpError(401,outcome.message);
  await createUserNotification({userId:outcome.userId,subject:'Double authentification activée',message:'La double authentification obligatoire a été activée sur votre compte.',eventType:'auth.2fa.enabled',referenceType:'user',referenceId:outcome.userId,eventKey:`auth.2fa.enabled:${outcome.userId}:${Date.now()}`,priority:'high'});
  return outcome;
}

export async function verifyLoginChallenge(challengeId:string,context:string,token:unknown,request:Request){
  const outcome=await transaction(async c=>{const challenge=await lockedChallenge(c,challengeId,context,'LOGIN_VERIFY'),factor=await lockedFactor(c,String(challenge.user_id));if(!factor?.enabled_at||factor.reset_required)throw new HttpError(409,'Configuration 2FA requise.');const result=await verifyTotpLocked(c,factor,code(token));if(!result){await failChallenge(c,challenge,request);return{ok:false as const}}await c.execute('UPDATE user_two_factor_auth SET last_accepted_time_step=? WHERE user_id=?',[result.timeStep,challenge.user_id]);await c.execute('UPDATE two_factor_challenges SET consumed_at=NOW() WHERE id=?',[challenge.id]);return{ok:true as const,userId:String(challenge.user_id)}});if(!outcome.ok)throw new HttpError(401,'Code 2FA incorrect ou expiré.');return outcome.userId;
}

export async function recoverLoginChallenge(challengeId:string,context:string,value:unknown,request:Request){
  const outcome=await transaction(async c=>{const challenge=await lockedChallenge(c,challengeId,context,'LOGIN_VERIFY'),hash=hashRecoveryCode(recovery(value));const[codes]=await c.execute<RowDataPacket[]>('SELECT id FROM two_factor_recovery_codes WHERE user_id=? AND code_hash=? AND used_at IS NULL FOR UPDATE',[challenge.user_id,hash]);if(!codes[0]){await failChallenge(c,challenge,request);return{ok:false as const}}await c.execute('UPDATE two_factor_recovery_codes SET used_at=NOW() WHERE id=? AND used_at IS NULL',[codes[0].id]);await c.execute('UPDATE two_factor_challenges SET consumed_at=NOW() WHERE id=?',[challenge.id]);await audit(c,request,String(challenge.user_id),String(challenge.user_id),'auth.2fa.recovery_used');return{ok:true as const,userId:String(challenge.user_id)}});if(!outcome.ok)throw new HttpError(401,'Code de récupération invalide ou déjà utilisé.');
  await createUserNotification({userId:outcome.userId,subject:'Code de récupération 2FA utilisé',message:'Un code de récupération a été utilisé pour accéder à votre compte.',eventType:'auth.2fa.recovery_used',referenceType:'user',referenceId:outcome.userId,eventKey:`auth.2fa.recovery_used:${outcome.userId}:${Date.now()}`,priority:'urgent'});
  return outcome.userId;
}

export async function status(userId:string){const state=await requirement(userId),[codes]=await query<RowDataPacket[]>('SELECT COUNT(*) total FROM two_factor_recovery_codes WHERE user_id=? AND used_at IS NULL',[userId]);return{...state,recoveryCodesRemaining:Number(codes?.total??0)}}

export async function assertSessionCurrent(userId:string,sessionId:string){
  const state=await requirement(userId);if(!state.enabled&&!state.required)return;
  const[session]=await query<RowDataPacket[]>('SELECT authenticated_at,two_factor_verified_at,two_factor_grandfathered FROM refresh_tokens WHERE id=? AND user_id=? AND revoked_at IS NULL',[sessionId,userId]);
  const grandfathered=Boolean(session?.two_factor_grandfathered&&session.authenticated_at)&&Date.now()-new Date(session!.authenticated_at).getTime()<=env.twoFactor.grandfatherGraceSeconds*1000;
  if(!state.enabled&&grandfathered)return;
  if(!state.enabled||!session?.two_factor_verified_at)throw new HttpError(401,'TWO_FACTOR_AUTHENTICATION_REQUIRED');
}

async function verifyCurrentFactor(c:PoolConnection,userId:string,value:unknown){const factor=await lockedFactor(c,userId);if(!factor?.enabled_at)throw new HttpError(409,'Aucun facteur 2FA actif.');const result=await verifyTotpLocked(c,factor,code(value));if(!result)throw new HttpError(401,'Code 2FA incorrect ou expiré.');await c.execute('UPDATE user_two_factor_auth SET last_accepted_time_step=? WHERE user_id=?',[result.timeStep,userId])}

async function assertRecentSession(request:Request){const[session]=await query<RowDataPacket[]>('SELECT authenticated_at FROM refresh_tokens WHERE id=? AND user_id=? AND revoked_at IS NULL',[request.user!.sid,request.user!.sub]);if(!session||Date.now()-new Date(session.authenticated_at).getTime()>10*60*1000)throw new HttpError(401,'Une authentification récente est requise. Reconnectez-vous.')}

export async function regenerateRecovery(request:Request,token:unknown){const userId=request.user!.sub;await assertRecentSession(request);const codes=await transaction(async c=>{await verifyCurrentFactor(c,userId,token);const values=await replaceRecoveryCodes(c,userId);await audit(c,request,userId,userId,'auth.2fa.recovery_regenerated',{count:values.length});return values});return{recoveryCodes:codes}}

export async function disable(request:Request,token:unknown){const userId=request.user!.sub,state=await requirement(userId);if(state.required)throw new HttpError(409,'La double authentification est obligatoire pour ce compte et ne peut pas être désactivée.');await assertRecentSession(request);await transaction(async c=>{await verifyCurrentFactor(c,userId,token);await c.execute('DELETE FROM two_factor_recovery_codes WHERE user_id=?',[userId]);await c.execute('UPDATE user_two_factor_auth SET encrypted_secret=NULL,secret_iv=NULL,secret_tag=NULL,secret_key_version=NULL,enabled_at=NULL,last_accepted_time_step=NULL,reset_required=FALSE WHERE user_id=?',[userId]);await c.execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND id<>? AND revoked_at IS NULL',[userId,request.user!.sid]);await audit(c,request,userId,userId,'auth.2fa.disabled')});await createUserNotification({userId,subject:'Double authentification désactivée',message:'La double authentification a été désactivée sur votre compte.',eventType:'auth.2fa.disabled',referenceType:'user',referenceId:userId,eventKey:`auth.2fa.disabled:${userId}:${Date.now()}`,priority:'urgent'});return{success:true}}

export async function assertRecentAndStrong(request:Request,totp:unknown,password:unknown){
  await assertRecentSession(request);
  const state=await requirement(request.user!.sub);if(state.enabled){await transaction(c=>verifyCurrentFactor(c,request.user!.sub,totp));return}
  const[user]=await query<RowDataPacket[]>('SELECT password_hash FROM users WHERE id=?',[request.user!.sub]);if(!user||typeof password!=='string'||!await argon2.verify(String(user.password_hash),password))throw new HttpError(401,'Vérification renforcée invalide.');
}

export function challengeFingerprint(request:Request){return contextHash(request.ip??'',request.get('user-agent')??'')}
