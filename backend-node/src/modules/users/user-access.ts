import type { Request } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import { query } from '../../config/database.js';
import { HttpError } from '../../shared/http-error.js';

export const ADMIN_ROLES = ['SUPER_ADMIN', 'DIRECTOR'] as const;
export const isSuperAdmin = (request: Request) => request.user?.roles.includes('SUPER_ADMIN') === true;

export async function targetRoles(userId: string) {
  return (await query<RowDataPacket[]>('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=?', [userId])).map((row) => String(row.code));
}

export async function assertCanManage(request: Request, userId: string) {
  const roles = await targetRoles(userId);
  if (roles.includes('SUPER_ADMIN') && !isSuperAdmin(request)) throw new HttpError(403, 'FORBIDDEN_SUPER_ADMIN_ACTION');
  return roles;
}

export function assertAssignableRoles(request: Request, roles: string[]) {
  if (!roles.length) throw new HttpError(400, 'INVALID_ROLE');
  if (roles.includes('SUPER_ADMIN') && !isSuperAdmin(request)) throw new HttpError(403, 'FORBIDDEN_SUPER_ADMIN_ACTION');
  if (roles.includes('DIRECTOR') && !isSuperAdmin(request)) throw new HttpError(403, 'Seul un SUPER_ADMIN peut attribuer le rôle DIRECTOR.');
}
