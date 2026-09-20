import type { Request } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '../../config/database.js';
import { HttpError } from '../../shared/http-error.js';
import { assertPermission, rbac, type PermissionScope } from '../rbac/rbac.service.js';

export type UserPermission='users.view'|'users.create'|'users.update'|'users.disable'|'users.reset_password'|'users.assign_role'|'users.assign_agency';
export async function isSuperAdmin(request:Request){return(await rbac(request)).isSuperAdmin}

async function actorConcessionId(request: Request) {
  if (!request.user?.agencyId) throw new HttpError(403, 'Aucune concession de rattachement.');
  const [row] = await query<RowDataPacket[]>('SELECT concession_id FROM agencies WHERE id=?', [request.user.agencyId]);
  if (!row) throw new HttpError(403, 'Concession de rattachement introuvable.');
  return String(row.concession_id);
}

export async function assertAgencyInActorScope(request: Request, agencyId: string, permission:UserPermission='users.assign_agency', targetUserId?:string) {
  const [agency] = await query<RowDataPacket[]>('SELECT id,concession_id,is_active FROM agencies WHERE id=?', [agencyId]);
  if (!agency) throw new HttpError(400, 'INVALID_AGENCY');
  if (!agency.is_active) throw new HttpError(409, 'AGENCY_INACTIVE');
  const context=await rbac(request);
  if(context.isSuperAdmin)return agency;
  const scope=await assertPermission(request,permission) as PermissionScope|null;
  const allowed=scope==='GLOBAL'||scope==='CONCESSION'&&String(agency.concession_id)===await actorConcessionId(request)||scope==='AGENCY'&&String(agency.id)===String(request.user!.agencyId)||scope==='OWN'&&targetUserId===request.user!.sub;
  if(!allowed)throw new HttpError(403,`Hors portée de la permission ${permission}`);
  return agency;
}

export async function assertCanViewTargetActor(request: Request, userId: string, permission:UserPermission='users.view') {
  const [target] = await query<RowDataPacket[]>('SELECT u.id,u.agency_id,a.concession_id FROM users u JOIN agencies a ON a.id=u.agency_id WHERE u.id=?', [userId]);
  if (!target) throw new HttpError(404, 'USER_NOT_FOUND');
  await assertAgencyInActorScope(request,String(target.agency_id),permission,userId);
  return target;
}

export async function targetRoles(userId: string) {
  return (await query<RowDataPacket[]>('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=?', [userId])).map((row) => String(row.code));
}

export async function targetHasSystemSuperAdmin(userId:string){
  const[row]=await query<RowDataPacket[]>("SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=? AND r.code='SUPER_ADMIN' AND r.is_system=TRUE LIMIT 1",[userId]);
  return Boolean(row);
}

export async function assertCanManage(request: Request, userId: string, permission:UserPermission='users.update') {
  await assertCanViewTargetActor(request, userId,permission);
  const roles = await targetRoles(userId);
  if (await targetHasSystemSuperAdmin(userId) && !await isSuperAdmin(request)) throw new HttpError(403, 'FORBIDDEN_SUPER_ADMIN_ACTION');
  return roles;
}

export async function assertAssignableRoles(request: Request, roles: string[]) {
  if (roles.length !== 1) throw new HttpError(400, 'Un utilisateur doit posséder exactement un rôle métier principal.');
  if(roles.includes('SUPER_ADMIN')){
    const[systemRole]=await query<RowDataPacket[]>("SELECT id FROM roles WHERE code='SUPER_ADMIN' AND is_system=TRUE LIMIT 1");
    if(systemRole&&!await isSuperAdmin(request))throw new HttpError(403,'FORBIDDEN_SUPER_ADMIN_ACTION');
  }
}
