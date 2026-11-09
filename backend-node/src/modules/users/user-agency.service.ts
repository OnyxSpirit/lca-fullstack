import type {PoolConnection,ResultSetHeader,RowDataPacket} from 'mysql2/promise';
import type {Request} from 'express';
import {query,transaction} from '../../config/database.js';
import {HttpError} from '../../shared/http-error.js';
import {writeAudit} from '../activity/audit-writer.js';
import {assertDelegablePermissions,assertPermission,rbac} from '../rbac/rbac.service.js';
import {assertAgencyInActorScope,assertCanManage,assertCanViewTargetActor,targetHasSystemSuperAdmin} from './user-access.js';

const identifier=(value:unknown,label:string)=>{const raw=String(value??'');if(!/^[1-9]\d*$/.test(raw))throw new HttpError(400,`${label} invalide.`);return raw};

export async function syncLegacyUserAgency(connection:PoolConnection,input:{userId:string;agencyId:string;roleIds:Array<string|number>;actorId:string;active?:boolean}){
 const active=input.active!==false;
 if(!active){await connection.execute("UPDATE user_agencies SET status='INACTIVE',is_primary=FALSE,deactivated_by=?,deactivated_at=NOW() WHERE user_id=? AND status='ACTIVE'",[input.actorId,input.userId]);return}
 await connection.execute("UPDATE user_agencies SET is_primary=FALSE,status=IF(agency_id=?,'ACTIVE',status),deactivated_by=IF(agency_id=?,NULL,deactivated_by),deactivated_at=IF(agency_id=?,NULL,deactivated_at) WHERE user_id=?",[input.agencyId,input.agencyId,input.agencyId,input.userId]);
 await connection.execute("INSERT INTO user_agencies(user_id,agency_id,is_primary,status,created_by) VALUES(?,?,TRUE,'ACTIVE',?) ON DUPLICATE KEY UPDATE is_primary=TRUE,status='ACTIVE',deactivated_by=NULL,deactivated_at=NULL",[input.userId,input.agencyId,input.actorId]);
 const[assignments]=await connection.execute<RowDataPacket[]>('SELECT id FROM user_agencies WHERE user_id=? AND agency_id=? FOR UPDATE',[input.userId,input.agencyId]),assignmentId=assignments[0]!.id;
 await connection.execute('DELETE uar FROM user_agency_roles uar JOIN roles r ON r.id=uar.role_id WHERE uar.user_agency_id=? AND r.is_system=FALSE',[assignmentId]);
 for(const roleId of input.roleIds){const[roles]=await connection.execute<RowDataPacket[]>('SELECT is_system FROM roles WHERE id=?',[roleId]);if(roles[0]&&!roles[0].is_system)await connection.execute('INSERT INTO user_agency_roles(user_agency_id,role_id,assigned_by) VALUES(?,?,?)',[assignmentId,roleId,input.actorId])}
}

async function assignment(connection:PoolConnection,id:string,userId:string,lock=false){
 const[rows]=await connection.execute<RowDataPacket[]>(`SELECT ua.*,a.name agency_name,a.code agency_code,a.is_active agency_active FROM user_agencies ua JOIN agencies a ON a.id=ua.agency_id WHERE ua.id=? AND ua.user_id=?${lock?' FOR UPDATE':''}`,[id,userId]);
 if(!rows[0])throw new HttpError(404,'Affectation utilisateur-agence introuvable.');
 return rows[0];
}

async function audit(connection:PoolConnection,request:Request,userId:string,action:string,values:unknown){
 await writeAudit(connection,request,{module:'users',entityType:'user',entityId:userId,action,newValues:values});
}

export async function listUserAgencies(userIdValue:unknown,request:Request){
 const userId=identifier(userIdValue,'Utilisateur');await assertCanViewTargetActor(request,userId,'users.view');
 const rows=await query<RowDataPacket[]>(`SELECT ua.id,ua.user_id,ua.agency_id,ua.is_primary,ua.status,ua.created_at,ua.updated_at,a.name agency_name,a.code agency_code,a.is_active agency_active,uar.role_id,r.code role_code,r.name role_name,r.is_active role_active,r.is_system FROM user_agencies ua JOIN agencies a ON a.id=ua.agency_id LEFT JOIN user_agency_roles uar ON uar.user_agency_id=ua.id LEFT JOIN roles r ON r.id=uar.role_id WHERE ua.user_id=? ORDER BY ua.is_primary DESC,a.name,r.name`,[userId]);
 const result=new Map<string,any>();for(const row of rows){const id=String(row.id);if(!result.has(id))result.set(id,{id,userId:String(row.user_id),agencyId:String(row.agency_id),agencyName:row.agency_name,agencyCode:row.agency_code,agencyActive:Boolean(row.agency_active),isPrimary:Boolean(row.is_primary),status:row.status,createdAt:row.created_at,updatedAt:row.updated_at,roles:[]});if(row.role_id!=null)result.get(id).roles.push({id:String(row.role_id),code:row.role_code,name:row.role_name,isActive:Boolean(row.role_active),isSystem:Boolean(row.is_system)})}
 return[...result.values()];
}

export async function addUserAgency(userIdValue:unknown,body:Record<string,unknown>,request:Request){
 const userId=identifier(userIdValue,'Utilisateur'),agencyId=identifier(body.agencyId,'Agence');await assertPermission(request,'users.assign_agency');await assertCanManage(request,userId,'users.assign_agency');await assertAgencyInActorScope(request,agencyId,'users.assign_agency',userId);
 const created=await transaction(async connection=>{const[existing]=await connection.execute<RowDataPacket[]>('SELECT id,status FROM user_agencies WHERE user_id=? AND agency_id=? FOR UPDATE',[userId,agencyId]);if(existing[0])throw new HttpError(409,'Cette affectation utilisateur-agence existe déjà.');const[result]=await connection.execute<ResultSetHeader>("INSERT INTO user_agencies(user_id,agency_id,is_primary,status,created_by) VALUES(?,?,FALSE,'ACTIVE',?)",[userId,agencyId,request.user!.sub]);await audit(connection,request,userId,'user.agency_assignment.created',{assignmentId:String(result.insertId),agencyId});return String(result.insertId)});
 return(await listUserAgencies(userId,request)).find(row=>row.id===created);
}

export async function setUserAgencyStatus(userIdValue:unknown,assignmentIdValue:unknown,activeValue:unknown,request:Request){
 const userId=identifier(userIdValue,'Utilisateur'),assignmentId=identifier(assignmentIdValue,'Affectation');if(typeof activeValue!=='boolean')throw new HttpError(400,'Statut d’affectation invalide.');await assertPermission(request,'users.assign_agency');await assertCanManage(request,userId,'users.assign_agency');
 await transaction(async connection=>{const current=await assignment(connection,assignmentId,userId,true);await assertAgencyInActorScope(request,String(current.agency_id),'users.assign_agency',userId);if(Boolean(current.is_primary)&&!activeValue)throw new HttpError(409,'L’agence principale historique ne peut pas être désactivée pendant la phase 1.');if(String(current.status)===(activeValue?'ACTIVE':'INACTIVE'))return;await connection.execute("UPDATE user_agencies SET status=?,is_primary=IF(?,is_primary,FALSE),deactivated_by=?,deactivated_at=? WHERE id=?",[activeValue?'ACTIVE':'INACTIVE',activeValue,activeValue?null:request.user!.sub,activeValue?null:new Date(),assignmentId]);await audit(connection,request,userId,activeValue?'user.agency_assignment.reactivated':'user.agency_assignment.deactivated',{assignmentId,agencyId:String(current.agency_id)})});
 return listUserAgencies(userId,request);
}

export async function setPrimaryUserAgency(userIdValue:unknown,assignmentIdValue:unknown,request:Request){
 const userId=identifier(userIdValue,'Utilisateur'),assignmentId=identifier(assignmentIdValue,'Affectation');await assertPermission(request,'users.assign_agency');await assertCanManage(request,userId,'users.assign_agency');
 await transaction(async connection=>{const current=await assignment(connection,assignmentId,userId,true);await assertAgencyInActorScope(request,String(current.agency_id),'users.assign_agency',userId);if(current.status!=='ACTIVE')throw new HttpError(409,'Une affectation inactive ne peut pas devenir principale.');const[legacy]=await connection.execute<RowDataPacket[]>('SELECT agency_id FROM users WHERE id=? FOR UPDATE',[userId]);if(String(legacy[0]?.agency_id)!==String(current.agency_id))throw new HttpError(409,'Le changement d’agence principale vers une agence secondaire sera activé en phase 2.');await connection.execute('UPDATE user_agencies SET is_primary=(id=?) WHERE user_id=?',[assignmentId,userId]);await audit(connection,request,userId,'user.agency_assignment.primary_confirmed',{assignmentId,agencyId:String(current.agency_id)})});
 return listUserAgencies(userId,request);
}

export async function addUserAgencyRole(userIdValue:unknown,assignmentIdValue:unknown,body:Record<string,unknown>,request:Request){
 const userId=identifier(userIdValue,'Utilisateur'),assignmentId=identifier(assignmentIdValue,'Affectation'),roleId=identifier(body.roleId,'Rôle');await assertPermission(request,'users.assign_role');await assertCanManage(request,userId,'users.assign_role');
 await transaction(async connection=>{const current=await assignment(connection,assignmentId,userId,true);await assertAgencyInActorScope(request,String(current.agency_id),'users.assign_role',userId);if(current.status!=='ACTIVE')throw new HttpError(409,'Impossible d’attribuer un rôle à une affectation inactive.');if(Boolean(current.is_primary))throw new HttpError(409,'Les rôles de l’agence historique restent gérés par le modèle RBAC actuel pendant la phase 1.');const[roles]=await connection.execute<RowDataPacket[]>('SELECT id,code,is_active,is_system FROM roles WHERE id=? FOR UPDATE',[roleId]),role=roles[0];if(!role||!role.is_active)throw new HttpError(400,'Rôle introuvable ou inactif.');if(role.is_system)throw new HttpError(403,'Un rôle système reste central et ne peut pas être dupliqué par agence.');const context=await rbac(request),[permissions]=await connection.execute<RowDataPacket[]>('SELECT p.code,rp.scope FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id AND p.is_active=TRUE WHERE rp.role_id=?',[roleId]);assertDelegablePermissions(context,permissions.map(row=>({code:String(row.code),scope:row.scope==null?null:String(row.scope) as any})));try{await connection.execute('INSERT INTO user_agency_roles(user_agency_id,role_id,assigned_by) VALUES(?,?,?)',[assignmentId,roleId,request.user!.sub])}catch(error:any){if(error?.code==='ER_DUP_ENTRY')throw new HttpError(409,'Ce rôle est déjà attribué dans cette agence.');throw error}await audit(connection,request,userId,'user.agency_role.assigned',{assignmentId,agencyId:String(current.agency_id),roleId})});
 return listUserAgencies(userId,request);
}

export async function removeUserAgencyRole(userIdValue:unknown,assignmentIdValue:unknown,roleIdValue:unknown,request:Request){
 const userId=identifier(userIdValue,'Utilisateur'),assignmentId=identifier(assignmentIdValue,'Affectation'),roleId=identifier(roleIdValue,'Rôle');await assertPermission(request,'users.assign_role');await assertCanManage(request,userId,'users.assign_role');
 await transaction(async connection=>{const current=await assignment(connection,assignmentId,userId,true);await assertAgencyInActorScope(request,String(current.agency_id),'users.assign_role',userId);if(Boolean(current.is_primary))throw new HttpError(409,'Les rôles de l’agence historique restent gérés par le modèle RBAC actuel pendant la phase 1.');const[result]=await connection.execute<ResultSetHeader>('DELETE FROM user_agency_roles WHERE user_agency_id=? AND role_id=?',[assignmentId,roleId]);if(!result.affectedRows)throw new HttpError(404,'Attribution de rôle introuvable.');await audit(connection,request,userId,'user.agency_role.removed',{assignmentId,agencyId:String(current.agency_id),roleId})});
 return listUserAgencies(userId,request);
}

export async function assertSystemSuperAdminUnaffected(userIdValue:unknown){const userId=identifier(userIdValue,'Utilisateur');return targetHasSystemSuperAdmin(userId)}
