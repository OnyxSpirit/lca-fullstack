import type { Request } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '../../config/database.js';
import { HttpError } from '../../shared/http-error.js';

export type PermissionScope = 'OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
export interface GrantedPermission { code:string; scope:PermissionScope|null }
export interface RbacContext { roleId:string|null; roleCode:string|null; isSuperAdmin:boolean; permissions:Map<string,PermissionScope|null> }

export async function resolveRbacContext(userId:string):Promise<RbacContext>{
  const [role]=await query<RowDataPacket[]>(`SELECT r.id,r.code,r.is_system FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE u.id=? AND u.is_active=TRUE AND r.is_active=TRUE LIMIT 1`,[userId]);
  if(!role)return{roleId:null,roleCode:null,isSuperAdmin:false,permissions:new Map()};
  const isSuperAdmin=String(role.code)==='SUPER_ADMIN'&&Boolean(role.is_system);
  const rows=await query<RowDataPacket[]>(`SELECT p.code,rp.scope FROM role_permissions rp JOIN permissions p ON p.id=rp.permission_id WHERE rp.role_id=? AND p.is_active=TRUE`,[role.id]);
  return{roleId:String(role.id),roleCode:String(role.code),isSuperAdmin,permissions:new Map(rows.map(row=>[String(row.code),row.scope==null?null:String(row.scope) as PermissionScope]))};
}

export async function rbac(request:Request){
  if(!request.user)throw new HttpError(401,'Jeton manquant');
  if(!request.rbac)request.rbac=await resolveRbacContext(request.user.sub);
  return request.rbac;
}

export async function assertPermission(request:Request,permission:string){
  const context=await rbac(request);
  if(context.isSuperAdmin)return 'GLOBAL' as PermissionScope;
  if(!context.permissions.has(permission))throw new HttpError(403,'Permission insuffisante : '+permission);
  return context.permissions.get(permission)??null;
}

export async function assertAnyPermission(request:Request,permissions:string[]){
  const context=await rbac(request);
  if(context.isSuperAdmin)return 'GLOBAL' as PermissionScope;
  for(const permission of permissions)if(context.permissions.has(permission))return context.permissions.get(permission)??null;
  throw new HttpError(403,'Aucune permission requise n’est attribuée.');
}

export function can(context:RbacContext,permission:string){return context.isSuperAdmin||context.permissions.has(permission)}

const scopeRank:Record<PermissionScope,number>={OWN:1,AGENCY:2,CONCESSION:3,GLOBAL:4};
export function assertDelegablePermissions(context:RbacContext,assignments:{code:string;scope:PermissionScope|null}[]){
  if(context.isSuperAdmin)return;
  for(const assignment of assignments){
    if(!context.permissions.has(assignment.code))throw new HttpError(403,`Permission non délégable : ${assignment.code}`);
    const own=context.permissions.get(assignment.code)??null;
    if(assignment.scope!==null&&(own===null||scopeRank[assignment.scope]>scopeRank[own]))throw new HttpError(403,`Scope non délégable : ${assignment.code}`);
  }
}
