import type{Request}from'express';
import type{PoolConnection,RowDataPacket}from'mysql2/promise';
import{query,transaction}from'../../config/database.js';
import{HttpError}from'../../shared/http-error.js';
import type{PermissionScope}from'./rbac.service.js';

export interface AgencyAccess{agencyId:string;code:string;name:string;isPrimary:boolean;concessionId:string}
export interface AgencyRole{id:string;code:string;name:string}
export interface AgencyPermission{code:string;scope:PermissionScope|null}
export interface AgencyRbacContext{
 userId:string;sessionId:string;activeAgencyId:string|null;contextVersion:number;isSuperAdmin:boolean;
 agencies:AgencyAccess[];roles:AgencyRole[];permissions:Map<string,PermissionScope|null>;
}

export type AgencyRbacRunner={execute:PoolConnection['execute']};
const databaseRunner={execute:async(sql:string,params?:any[])=>[await query<RowDataPacket[]>(sql,params??[]),[]] as any} as AgencyRbacRunner;
const scopeRank:Record<PermissionScope,number>={OWN:1,AGENCY:2,CONCESSION:3,GLOBAL:4};
const rows=async(runner:AgencyRbacRunner,sql:string,params:unknown[]=[])=>(await runner.execute<RowDataPacket[]>(sql,params as any[]))[0];
const isSystemSuperAdmin=async(runner:AgencyRbacRunner,userId:string)=>Boolean((await rows(runner,`SELECT 1 FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND u.is_active=TRUE AND r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE LIMIT 1`,[userId]))[0]);

export function mergeAgencyPermissions(grants:ReadonlyArray<{code:string;scope:PermissionScope|null}>){
 const merged=new Map<string,PermissionScope|null>();
 for(const grant of grants){const prior=merged.get(grant.code);if(!merged.has(grant.code)||grant.scope!==null&&(prior==null||scopeRank[grant.scope]>scopeRank[prior]))merged.set(grant.code,grant.scope)}
 return merged;
}

async function accessibleAgencies(runner:AgencyRbacRunner,userId:string,superAdmin:boolean):Promise<AgencyAccess[]>{
 const result=superAdmin
  ?await rows(runner,`SELECT a.id agency_id,a.code,a.name,a.concession_id,FALSE is_primary FROM agencies a WHERE a.is_active=TRUE ORDER BY a.name,a.id`)
  :await rows(runner,`SELECT a.id agency_id,a.code,a.name,a.concession_id,ua.is_primary FROM user_agencies ua JOIN agencies a ON a.id=ua.agency_id AND a.is_active=TRUE WHERE ua.user_id=? AND ua.status='ACTIVE' ORDER BY ua.is_primary DESC,a.name,a.id`,[userId]);
 return result.map(row=>({agencyId:String(row.agency_id),code:String(row.code),name:String(row.name),isPrimary:Boolean(row.is_primary),concessionId:String(row.concession_id)}));
}

async function resolveWith(runner:AgencyRbacRunner,userId:string,sessionId:string,persistFallback:boolean):Promise<AgencyRbacContext>{
 const[session]=await rows(runner,`SELECT rt.active_agency_id,rt.agency_context_version FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id AND u.is_active=TRUE WHERE rt.id=? AND rt.user_id=? AND rt.revoked_at IS NULL AND rt.expires_at>NOW() LIMIT 1`,[sessionId,userId]);
 if(!session)throw new HttpError(401,'Session inactive ou expirée');
 const superAdmin=await isSystemSuperAdmin(runner,userId),agencies=await accessibleAgencies(runner,userId,superAdmin);
 let activeAgencyId=session.active_agency_id==null?null:String(session.active_agency_id);
 if(activeAgencyId&&!agencies.some(agency=>agency.agencyId===activeAgencyId))activeAgencyId=null;
 if(!activeAgencyId){activeAgencyId=agencies.find(agency=>agency.isPrimary)?.agencyId??null;if(superAdmin&&!activeAgencyId)activeAgencyId=agencies[0]?.agencyId??null}
 if(persistFallback&&activeAgencyId&&String(session.active_agency_id??'')!==activeAgencyId)await runner.execute('UPDATE refresh_tokens SET active_agency_id=?,agency_context_version=agency_context_version+1 WHERE id=? AND user_id=? AND revoked_at IS NULL',[activeAgencyId,sessionId,userId]);
 let roles:AgencyRole[]=[],permissions=new Map<string,PermissionScope|null>();
 if(activeAgencyId&&superAdmin){
  const grants=await rows(runner,`SELECT p.code,rp.scope FROM user_roles ur JOIN roles r ON r.id=ur.role_id AND r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE WHERE ur.user_id=?`,[userId]);
  const systemRoles=await rows(runner,`SELECT r.id,r.code,r.name FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.code='SUPER_ADMIN' AND r.is_system=TRUE AND r.is_active=TRUE`,[userId]);
  roles=systemRoles.map(role=>({id:String(role.id),code:String(role.code),name:String(role.name)}));permissions=mergeAgencyPermissions(grants.map(row=>({code:String(row.code),scope:row.scope==null?null:String(row.scope) as PermissionScope})));
 }else if(activeAgencyId){
  const roleRows=await rows(runner,`SELECT r.id,r.code,r.name FROM user_agencies ua JOIN user_agency_roles uar ON uar.user_agency_id=ua.id JOIN roles r ON r.id=uar.role_id AND r.is_active=TRUE AND r.is_system=FALSE WHERE ua.user_id=? AND ua.agency_id=? AND ua.status='ACTIVE' ORDER BY r.code,r.id`,[userId,activeAgencyId]);
  roles=roleRows.map(role=>({id:String(role.id),code:String(role.code),name:String(role.name)}));
  const grants=await rows(runner,`SELECT p.code,rp.scope FROM user_agencies ua JOIN user_agency_roles uar ON uar.user_agency_id=ua.id JOIN roles r ON r.id=uar.role_id AND r.is_active=TRUE AND r.is_system=FALSE JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE WHERE ua.user_id=? AND ua.agency_id=? AND ua.status='ACTIVE'`,[userId,activeAgencyId]);
  permissions=mergeAgencyPermissions(grants.map(row=>({code:String(row.code),scope:row.scope==null?null:String(row.scope) as PermissionScope})));
 }
 return{userId,sessionId,activeAgencyId,contextVersion:Number(session.agency_context_version)+(persistFallback&&activeAgencyId&&String(session.active_agency_id??'')!==activeAgencyId?1:0),isSuperAdmin:superAdmin,agencies,roles,permissions};
}

export async function resolveAgencyRbacContext(userId:string,sessionId:string){return resolveWith(databaseRunner,userId,sessionId,true)}
export async function resolveAgencyRbacContextWithRunner(runner:AgencyRbacRunner,userId:string,sessionId:string){return resolveWith(runner,userId,sessionId,false)}

export async function selectActiveAgency(userId:string,sessionId:string,agencyId:string){
 if(!/^[1-9]\d*$/.test(agencyId))throw new HttpError(400,'Agence invalide');
 return transaction(async connection=>{
  const[session]=await rows(connection,`SELECT rt.id FROM refresh_tokens rt JOIN users u ON u.id=rt.user_id AND u.is_active=TRUE WHERE rt.id=? AND rt.user_id=? AND rt.revoked_at IS NULL AND rt.expires_at>NOW() FOR UPDATE`,[sessionId,userId]);
  if(!session)throw new HttpError(401,'Session inactive ou expirée');
  const[agency]=await rows(connection,'SELECT id FROM agencies WHERE id=? AND is_active=TRUE LIMIT 1',[agencyId]);if(!agency)throw new HttpError(404,'Agence introuvable ou inactive');
  const superAdmin=await isSystemSuperAdmin(connection,userId);
  const assignment=superAdmin?true:Boolean((await rows(connection,`SELECT 1 FROM user_agencies WHERE user_id=? AND agency_id=? AND status='ACTIVE' LIMIT 1`,[userId,agencyId]))[0]);
  if(!assignment)throw new HttpError(403,'Agence non autorisée');
  await connection.execute('UPDATE refresh_tokens SET active_agency_id=?,agency_context_version=agency_context_version+1 WHERE id=? AND user_id=?',[agencyId,sessionId,userId]);
  return resolveWith(connection,userId,sessionId,false);
 });
}

export const serializeAgencyContext=(context:AgencyRbacContext)=>({
 activeAgencyId:context.activeAgencyId,contextVersion:context.contextVersion,isSuperAdmin:context.isSuperAdmin,agencies:context.agencies,roles:context.roles,
 permissions:[...context.permissions.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([code,scope])=>({code,scope})),
});

export async function agencyContext(request:Request){if(!request.user)throw new HttpError(401,'Jeton manquant');return request.agencyRbac??resolveAgencyRbacContext(request.user.sub,request.user.sid)}
