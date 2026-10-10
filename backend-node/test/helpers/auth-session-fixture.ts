import {randomUUID} from 'node:crypto';
import jwt, {type SignOptions} from 'jsonwebtoken';
import type {RowDataPacket} from 'mysql2/promise';
import {pool} from '../../src/config/database.js';
import {env} from '../../src/config/env.js';

export type TestSessionState='ACTIVE'|'EXPIRED'|'REVOKED'|'ABSENT';
export type TestPermissionScope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';
export type TestPermission={code:string;scope:TestPermissionScope|null};
export type TestAccessIdentity={
  userId:string;
  email?:string;
  agencyId?:string|null;
  roles?:string[];
  permissions?:TestPermission[];
  sessionState?:TestSessionState;
  expiresIn?:SignOptions['expiresIn'];
  secret?:string;
  mockRbac?:boolean;
};

type Fixture={userId:string;agencyId:string|null;roles:string[];permissions:TestPermission[];state:TestSessionState;mockRbac:boolean};
const sessions=new Map<string,Fixture>();
const marker=Symbol.for('lca.test.auth-session-fixture');

const permission=(code:string,scope:TestPermissionScope|null='AGENCY'):TestPermission=>({code,scope});
const rolePermissions:Record<string,TestPermission[]>={
  UNKNOWN_ROLE:[],
  TECHNICIAN:[permission('workshop.view','OWN'),permission('workshop.session.track','OWN'),permission('documents.view','OWN'),permission('documents.upload','OWN'),permission('parts.view','AGENCY')],
  RECEPTIONIST:[permission('crm.prospect.view'),permission('crm.prospect.create'),permission('crm.prospect.assign'),permission('customers.view'),permission('customers.create'),permission('showroom.view'),permission('showroom.register'),permission('vehicles.view')],
  SALES_AGENT:[permission('crm.prospect.view','OWN'),permission('crm.prospect.create'),permission('crm.prospect.update','OWN'),permission('crm.activity.create','OWN'),permission('sales.view','OWN'),permission('sales.create','OWN'),permission('quotations.view','OWN'),permission('quotations.create','OWN'),permission('quotations.update','OWN'),permission('quotations.validate','OWN'),permission('vehicles.view'),permission('documents.view','OWN'),permission('documents.upload','OWN'),permission('notifications.update','OWN')],
  SALES_MANAGER:[permission('crm.prospect.view'),permission('crm.prospect.create'),permission('crm.prospect.update'),permission('crm.prospect.assign'),permission('crm.activity.create'),permission('sales.view'),permission('sales.create'),permission('quotations.view'),permission('quotations.create'),permission('quotations.update'),permission('quotations.validate'),permission('vehicles.view'),permission('vehicles.create'),permission('vehicles.update')],
  SERVICE_ADVISOR:[permission('workshop.view'),permission('workshop.create'),permission('workshop.update'),permission('customers.view'),permission('vehicles.view')],
  SERVICE_MANAGER:[permission('workshop.view'),permission('workshop.create'),permission('workshop.update'),permission('workshop.plan'),permission('workshop.assign_technician'),permission('workshop.productivity.view')],
  WORKSHOP_MANAGER:[permission('workshop.view'),permission('workshop.plan'),permission('workshop.assign_technician'),permission('workshop.assign_bay'),permission('workshop.productivity.view')],
  PARTS_MANAGER:[permission('parts.view'),permission('parts.catalog.manage'),permission('parts.stock.manage'),permission('parts.order.create'),permission('parts.inventory.manage'),permission('reports.parts.view')],
  WAREHOUSE_CLERK:[permission('parts.view'),permission('parts.receive'),permission('parts.inventory.manage')],
  DELIVERY_MANAGER:[permission('deliveries.view'),permission('deliveries.create'),permission('deliveries.update'),permission('deliveries.plan')],
  ACCOUNTANT:[permission('billing.invoice.view'),permission('billing.invoice.create'),permission('billing.payment.view'),permission('billing.payment.collect')],
  DIRECTOR:[permission('crm.prospect.view','GLOBAL'),permission('customers.view','GLOBAL'),permission('vehicles.view','GLOBAL'),permission('showroom.view','GLOBAL'),permission('deliveries.view','GLOBAL'),permission('workshop.view','GLOBAL'),permission('reports.view','GLOBAL'),permission('reports.export','GLOBAL'),permission('settings.view','CONCESSION'),permission('settings.update','CONCESSION'),permission('agencies.create','CONCESSION'),permission('documents.view','GLOBAL')],
};

function installInterceptor(){
  const current=pool.execute as typeof pool.execute&{[marker]?:boolean};
  if(current[marker])return;
  const delegate=current.bind(pool);
  const wrapped=async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('JOIN refresh_tokens rt ON rt.id=?')){
      const fixture=sessions.get(String(params[0]));
      return [fixture&&fixture.state==='ACTIVE'&&fixture.userId===String(params[1])?[{id:fixture.userId,agency_id:fixture.agencyId} as RowDataPacket]:[],[]] as any;
    }
    if(sql.includes('SELECT r.id,r.code,r.is_system')&&String(params[0])){
      const fixture=[...sessions.values()].find(item=>item.userId===String(params[0])&&item.mockRbac);
      if(fixture){const code=fixture.roles[0]??'TEST_ROLE';return [[{id:`test-role-${fixture.userId}`,code,is_system:0}],[]] as any}
    }
    if(sql.includes('SELECT p.code,rp.scope')&&String(params[0]).startsWith('test-role-')){
      const userId=String(params[0]).slice('test-role-'.length),fixture=[...sessions.values()].find(item=>item.userId===userId&&item.mockRbac);
      return [fixture?.permissions??[],[]] as any;
    }
    return delegate(sql as any,params as any) as any;
  };
  Object.defineProperty(wrapped,marker,{value:true});
  (pool as any).execute=wrapped;
}

export function issueTestAccessToken(identity:TestAccessIdentity){
  installInterceptor();
  const sid=`test-${identity.userId}-${randomUUID()}`,roles=identity.roles??[],permissions=identity.permissions??roles.flatMap(role=>rolePermissions[role]??[]),state=identity.sessionState??'ACTIVE';
  if(state!=='ABSENT')sessions.set(sid,{userId:identity.userId,agencyId:identity.agencyId??null,roles,permissions,state,mockRbac:Boolean(identity.mockRbac)});
  return jwt.sign({sub:identity.userId,email:identity.email??`${identity.userId}@test.local`,roles,agencyId:identity.agencyId??null,sid},identity.secret??env.jwt.accessSecret,{algorithm:'HS256',expiresIn:identity.expiresIn??'5m'});
}

export function revokeTestSession(token:string){const payload=jwt.decode(token)as{sid?:string}|null;if(payload?.sid){const fixture=sessions.get(payload.sid);if(fixture)fixture.state='REVOKED'}}
export function clearTestAuthSessions(){sessions.clear()}
