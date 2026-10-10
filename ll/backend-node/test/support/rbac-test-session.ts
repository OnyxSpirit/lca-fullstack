import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { env } from '../../src/config/env.js';

export type TestScope = 'OWN' | 'AGENCY' | 'CONCESSION' | 'GLOBAL';
export type TestPermission = { code: string; scope: TestScope | null };
export type TestAgency = { id: string; concessionId: string };
export type TestUser = { id: string; agencyId: string; email?: string; active?: boolean };
export type TestResource = { id: string; agencyId: string; ownerId?: string | null };

type TestRole = { id: string; code: string; active: boolean; isSystem: boolean; permissions: TestPermission[] };
type TestSession = { id: string; userId: string; expiresAt: number; revoked: boolean };

export class RbacTestSessionFixture {
  readonly agencies = new Map<string, TestAgency>();
  readonly users = new Map<string, TestUser>();
  readonly roles = new Map<string, TestRole>();
  readonly userRoles = new Map<string, string>();
  readonly sessions = new Map<string, TestSession>();
  readonly resources = new Map<string, TestResource>();

  addAgency(agency: TestAgency) { this.agencies.set(agency.id, agency); }
  addResource(resource: TestResource) { this.resources.set(resource.id, resource); }

  createRbacTestSession(input: {
    user: TestUser;
    roleCode?: string;
    permissions?: TestPermission[];
    sessionId?: string;
    expiresAt?: number;
    revoked?: boolean;
  }) {
    const user = { ...input.user, email: input.user.email ?? `${input.user.id}@rbac.test`, active: input.user.active ?? true };
    const roleId = `role-${user.id}-${randomUUID()}`;
    const role = { id: roleId, code: input.roleCode ?? `ROLE_RBAC_${user.id}`, active: true, isSystem: false, permissions: input.permissions ?? [] };
    const sid = input.sessionId ?? randomUUID();
    this.users.set(user.id, user);
    this.roles.set(roleId, role);
    this.userRoles.set(user.id, roleId);
    this.sessions.set(sid, { id: sid, userId: user.id, expiresAt: input.expiresAt ?? Date.now() + 300_000, revoked: input.revoked ?? false });
    const accessToken = jwt.sign({ sub: user.id, email: user.email, roles: [role.code], agencyId: user.agencyId, sid }, env.jwt.accessSecret, { algorithm: 'HS256', expiresIn: '5m' });
    return { accessToken, sid, user, role };
  }

  createTokenWithoutSid(user: TestUser) {
    return jwt.sign({ sub: user.id, email: user.email ?? `${user.id}@rbac.test`, roles: [], agencyId: user.agencyId }, env.jwt.accessSecret, { algorithm: 'HS256', expiresIn: '5m' });
  }

  revoke(sid: string) { const session = this.sessions.get(sid); if (session) session.revoked = true; }

  authRows(params: unknown[]) {
    const sid = String(params[0]), userId = String(params[1]);
    const session = this.sessions.get(sid), user = this.users.get(userId);
    return user?.active !== false && session?.userId === userId && !session.revoked && session.expiresAt > Date.now()
      ? [{ id: user.id, agency_id: user.agencyId }]
      : [];
  }

  async query<T extends RowDataPacket[]>(sql: string, params: unknown[] = []): Promise<T> {
    if (sql.includes('JOIN refresh_tokens rt')) return this.authRows(params) as T;
    if (sql.includes('SELECT r.id,r.code,r.is_system FROM users u JOIN user_roles')) {
      const role = this.roles.get(this.userRoles.get(String(params[0])) ?? '');
      return (role?.active ? [{ id: role.id, code: role.code, is_system: role.isSystem ? 1 : 0 }] : []) as T;
    }
    if (sql.includes('SELECT p.code,rp.scope FROM role_permissions')) {
      const role = this.roles.get(String(params[0]));
      return (role?.permissions ?? []) as T;
    }
    if (sql.includes('FROM showroom_visits sv')) {
      const resource = this.resources.get(String(params[0]));
      if (!resource) return [] as T;
      let allowed = true;
      if (sql.includes('sv.agency_id=? AND (sv.assigned_user_id=?')) allowed = resource.agencyId === String(params[1]) && resource.ownerId === String(params[2]);
      else if (sql.includes('sv.agency_id=?')) allowed = resource.agencyId === String(params[1]);
      else if (sql.includes('scoped_agency.concession_id=')) {
        const actorAgency = this.agencies.get(String(params[1])), targetAgency = this.agencies.get(resource.agencyId);
        allowed = Boolean(actorAgency && targetAgency && actorAgency.concessionId === targetAgency.concessionId);
      }
      return (allowed ? [{ id: resource.id, agency_id: resource.agencyId, assigned_user_id: resource.ownerId ?? null, greeted_by: resource.ownerId ?? null, visitor_name: `Visiteur ${resource.id}`, phone: null, reason: 'Test', preferred_model: null, vehicle_id: null, vehicle_label: null, queue_number: Number(resource.id), status: 'waiting', outcome: null, arrival_at: new Date().toISOString(), assigned_at: null, completed_at: null, cancellation_reason: null, notes: null, customer_id: null, lead_id: null, assigned_user_name: null, greeted_by_name: null, wait_minutes: 0, active_test_drive_id: null, active_test_drive_mileage: null }] : []) as T;
    }
    if (sql.includes('FROM showroom_test_drives td') && sql.includes('WHERE td.visit_id=?')) return [] as T;
    throw new Error(`Requête de fixture RBAC non gérée: ${sql}`);
  }

  async execute(): Promise<ResultSetHeader> { throw new Error('Aucune écriture attendue dans cette fixture RBAC'); }
  async transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> { return work({} as PoolConnection); }

  installPoolMock(pool: { execute: (...args: any[]) => Promise<any> }) {
    const originalExecute = pool.execute.bind(pool);
    pool.execute = async (sql: string, params: unknown[] = []) => [await this.query(sql, params), []];
    return () => { pool.execute = originalExecute; };
  }
}
