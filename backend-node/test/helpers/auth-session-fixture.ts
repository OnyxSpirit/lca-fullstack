import {randomUUID} from 'node:crypto';
import {AsyncLocalStorage} from 'node:async_hooks';
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
const users=new Map<string,Fixture>();
const requestFixture=new AsyncLocalStorage<Fixture>();
const marker=Symbol.for('lca.test.auth-session-fixture');
const connectionMarker=Symbol.for('lca.test.auth-session-fixture.connection');

const permission=(code:string,scope:TestPermissionScope|null='AGENCY'):TestPermission=>({code,scope});
const rolePermissions:Record<string,TestPermission[]>={
  UNKNOWN_ROLE:[],
  TECHNICIAN:[permission('workshop.view','OWN'),permission('service.order.view','OWN'),permission('service.order.update','OWN'),permission('service.order.advance','OWN'),permission('workshop.intervention.view','OWN'),permission('workshop.session.track','OWN'),permission('ged.view','OWN'),permission('ged.upload','OWN'),permission('parts.catalog.view','AGENCY')],
  RECEPTIONIST:[permission('crm.prospect.view'),permission('crm.prospect.create'),permission('crm.prospect.assign'),permission('customers.view'),permission('customers.create'),permission('showroom.view'),permission('showroom.visitor.create'),permission('vehicles.view')],
  SALES_AGENT:[permission('crm.prospect.view','OWN'),permission('crm.prospect.create'),permission('crm.prospect.update','OWN'),permission('crm.activity.create','OWN'),permission('sales.view','OWN'),permission('sales.create','OWN'),permission('quotations.view','OWN'),permission('quotations.create','OWN'),permission('quotations.update','OWN'),permission('quotations.validate','OWN'),permission('vehicles.view'),permission('ged.view','OWN'),permission('ged.upload','OWN'),permission('notifications.update','OWN')],
  SALES_MANAGER:[permission('crm.prospect.view'),permission('crm.prospect.create'),permission('crm.prospect.update'),permission('crm.prospect.assign'),permission('crm.activity.create'),permission('sales.view'),permission('sales.create'),permission('quotations.view'),permission('quotations.create'),permission('quotations.update'),permission('quotations.validate'),permission('vehicles.view'),permission('vehicles.create'),permission('vehicles.update')],
  SERVICE_ADVISOR:[permission('workshop.view'),permission('service.order.view'),permission('service.order.create'),permission('service.order.update'),permission('service.order.receive'),permission('customers.view'),permission('vehicles.view')],
  SERVICE_MANAGER:[permission('workshop.view'),permission('service.order.view'),permission('service.order.create'),permission('service.order.update'),permission('workshop.plan'),permission('workshop.schedule.view'),permission('workshop.productivity.view'),permission('service.order.assign_technician')],
  WORKSHOP_MANAGER:[permission('workshop.view'),permission('service.order.view'),permission('workshop.plan'),permission('workshop.schedule.view'),permission('workshop.productivity.view'),permission('service.order.assign_technician'),permission('workshop.bay.manage')],
  PARTS_MANAGER:[permission('parts.catalog.view'),permission('parts.catalog.manage'),permission('parts.stock.view'),permission('parts.stock.adjust'),permission('parts.stock.move'),permission('parts.purchase_order.view'),permission('parts.purchase_order.create'),permission('parts.purchase_order.update'),permission('parts.inventory.manage'),permission('parts.reporting.view'),permission('reporting.view'),permission('reporting.export'),permission('service.order.update')],
  WAREHOUSE_CLERK:[permission('parts.catalog.view'),permission('parts.stock.view'),permission('parts.purchase_order.view'),permission('parts.purchase_order.receive'),permission('parts.inventory.manage')],
  DELIVERY_MANAGER:[permission('delivery.view'),permission('delivery.schedule'),permission('delivery.prepare'),permission('delivery.complete')],
  ACCOUNTANT:[permission('billing.invoice.view'),permission('billing.invoice.create'),permission('billing.invoice.cancel'),permission('billing.payment.view'),permission('billing.payment.collect'),permission('billing.payment.refund')],
  DIRECTOR:[permission('dashboard.view','GLOBAL'),permission('crm.prospect.view','GLOBAL'),permission('customers.view','GLOBAL'),permission('vehicles.view','GLOBAL'),permission('vehicles.financials.view','GLOBAL'),permission('showroom.view','GLOBAL'),permission('delivery.view','GLOBAL'),permission('service.order.view','GLOBAL'),permission('workshop.view','GLOBAL'),permission('workshop.productivity.view','GLOBAL'),permission('reporting.view','GLOBAL'),permission('reporting.export','GLOBAL'),permission('settings.view','CONCESSION'),permission('settings.update','CONCESSION'),permission('settings.general.view','CONCESSION'),permission('settings.general.manage','CONCESSION'),permission('settings.agencies.view','CONCESSION'),permission('settings.agencies.manage','CONCESSION'),permission('agencies.create','CONCESSION'),permission('ged.view','GLOBAL'),permission('ged.upload','GLOBAL'),permission('billing.view','GLOBAL'),permission('billing.invoice.view','GLOBAL'),permission('billing.payment.view','GLOBAL'),permission('sales.view','GLOBAL')],
};

function installInterceptor(){
  const current=pool.execute as typeof pool.execute&{[marker]?:boolean};
  if(current[marker])return;
  const delegate=current.bind(pool);
  const intercepted=async(sql:string,params:unknown[]=[])=>{
    if(sql.includes('JOIN refresh_tokens rt ON rt.id=?')){
      const fixture=sessions.get(String(params[0]));
      if(fixture)requestFixture.enterWith(fixture);
      return [fixture&&fixture.state==='ACTIVE'&&fixture.userId===String(params[1])?[{id:fixture.userId,agency_id:fixture.agencyId} as RowDataPacket]:[],[]] as any;
    }
    if(sql.includes('SELECT rt.active_agency_id,rt.agency_context_version FROM refresh_tokens rt')){
      const fixture=sessions.get(String(params[0]));
      return [fixture&&fixture.state==='ACTIVE'&&fixture.userId===String(params[1])?[{active_agency_id:fixture.agencyId,agency_context_version:0} as RowDataPacket]:[],[]] as any;
    }
    if(sql.includes('SELECT active_agency_id,agency_context_version FROM refresh_tokens WHERE id=?')){
      const fixture=sessions.get(String(params[0]));
      return [fixture&&fixture.state==='ACTIVE'&&fixture.userId===String(params[1])?[{active_agency_id:fixture.agencyId,agency_context_version:0} as RowDataPacket]:[],[]] as any;
    }
    if(sql.includes('FROM users u JOIN user_roles ur')&&sql.includes("r.code='SUPER_ADMIN'")){
      const fixture=requestFixture.getStore()??users.get(String(params[0]));
      if(fixture?.mockRbac)return [fixture.roles.includes('SUPER_ADMIN')?[{allowed:1} as RowDataPacket]:[],[]] as any;
    }
    if(sql.includes('FROM agencies a WHERE a.is_active=TRUE')){
      const fixture=requestFixture.getStore();
      if(fixture?.mockRbac&&fixture.roles.includes('SUPER_ADMIN')&&fixture.agencyId)return [[{agency_id:fixture.agencyId,code:`AG-${fixture.agencyId}`,name:`Agence ${fixture.agencyId}`,concession_id:'1',is_primary:0} as RowDataPacket],[]] as any;
    }
    if(sql.includes('SELECT p.code,rp.scope FROM user_roles ur')&&sql.includes("r.code='SUPER_ADMIN'")){
      const fixture=requestFixture.getStore()??users.get(String(params[0]));
      if(fixture?.mockRbac&&fixture.roles.includes('SUPER_ADMIN'))return [fixture.permissions,[]] as any;
    }
    if(sql.includes('SELECT r.id,r.code,r.name FROM user_roles ur')&&sql.includes("r.code='SUPER_ADMIN'")){
      const fixture=requestFixture.getStore()??users.get(String(params[0]));
      if(fixture?.mockRbac&&fixture.roles.includes('SUPER_ADMIN'))return [[{id:`test-system-role-${fixture.userId}`,code:'SUPER_ADMIN',name:'SUPER_ADMIN'} as RowDataPacket],[]] as any;
    }
    if(sql.includes('FROM user_agencies ua JOIN agencies a')&&sql.includes("ua.status='ACTIVE'")){
      const fixture=requestFixture.getStore()??users.get(String(params[0]));
      if(fixture?.mockRbac&&fixture.agencyId)return [[{agency_id:fixture.agencyId,code:`AG-${fixture.agencyId}`,name:`Agence ${fixture.agencyId}`,concession_id:'1',is_primary:1} as RowDataPacket],[]] as any;
    }
    if(sql.includes('SELECT r.id,r.code,r.name FROM user_agencies')){
      const fixture=requestFixture.getStore()??users.get(String(params[0]));
      if(fixture?.mockRbac){const roles=fixture.roles.length?fixture.roles:['TEST_ROLE'];return [roles.map((code,index)=>({id:`test-role-${fixture.userId}-${index}`,code,name:code} as RowDataPacket)),[]] as any}
    }
    if(sql.includes('SELECT p.code,rp.scope FROM user_agencies')){
      const fixture=requestFixture.getStore()??users.get(String(params[0]));
      if(fixture?.mockRbac)return [fixture.permissions,[]] as any;
    }
    if(sql.includes('SELECT ua.id FROM user_agencies ua WHERE ua.user_id=?')&&sql.includes("ua.status='ACTIVE' FOR SHARE")){
      const fixture=requestFixture.getStore()??users.get(String(params[0]));
      if(fixture?.mockRbac&&fixture.agencyId===String(params[1]))return [[{id:`test-assignment-${fixture.userId}`} as RowDataPacket],[]] as any;
    }
    if(sql.includes('SELECT uar.role_id,rp.permission_id FROM user_agency_roles uar')&&sql.includes('FOR SHARE')){
      const fixture=requestFixture.getStore();
      if(fixture?.mockRbac)return [[{role_id:`test-role-${fixture.userId}`,permission_id:'test-permission'} as RowDataPacket],[]] as any;
    }
    if(sql.includes("r.code='SUPER_ADMIN'")&&sql.includes('role_two_factor_policies')){
      const fixture=requestFixture.getStore()??users.get(String(params[2]));
      if(fixture)return [[{super_admin:0,individually_required:0,role_required:0,enabled_at:null,reset_required:0} as RowDataPacket],[]] as any;
    }
    if(sql.includes('SELECT r.id,r.code,r.is_system')&&String(params[0])){
      const fixture=requestFixture.getStore()??users.get(String(params[0]));
      if(fixture?.mockRbac){const code=fixture.roles[0]??'TEST_ROLE';return [[{id:`test-role-${fixture.userId}`,code,is_system:0}],[]] as any}
    }
    if(sql.includes('SELECT p.code,rp.scope')&&String(params[0]).startsWith('test-role-')){
      const userId=String(params[0]).slice('test-role-'.length),fixture=requestFixture.getStore()??users.get(userId);
      if(fixture?.mockRbac)return [fixture.permissions,[]] as any;
    }
    return undefined;
  };
  const wrapped=async(sql:string,params:unknown[]=[])=>await intercepted(sql,params)??delegate(sql as any,params as any) as any;
  Object.defineProperty(wrapped,marker,{value:true});
  (pool as any).execute=wrapped;

  const currentGetConnection=pool.getConnection.bind(pool);
  (pool as any).getConnection=async()=>{
    const connection=await currentGetConnection();
    const execute=connection.execute as typeof connection.execute&{[connectionMarker]?:boolean};
    if(!execute[connectionMarker]){
      const connectionDelegate=execute.bind(connection);
      const connectionExecute=async(sql:string,params:unknown[]=[])=>await intercepted(sql,params)??connectionDelegate(sql as any,params as any) as any;
      Object.defineProperty(connectionExecute,connectionMarker,{value:true});
      (connection as any).execute=connectionExecute;
    }
    return connection;
  };
}

export function issueTestAccessToken(identity:TestAccessIdentity){
  installInterceptor();
  const sid=`test-${identity.userId}-${randomUUID()}`,roles=identity.roles??[],permissions=identity.permissions??roles.flatMap(role=>rolePermissions[role]??[]),state=identity.sessionState??'ACTIVE';
  if(state!=='ABSENT'){
    const mockRbac=identity.mockRbac!==false;
    const fixture={userId:identity.userId,agencyId:identity.agencyId??(mockRbac?'1':null),roles,permissions,state,mockRbac};
    sessions.set(sid,fixture);
    // Every issued test identity must be discoverable by user id for the
    // session-current 2FA policy query. Some route fixtures replace the
    // refresh-token lookup themselves, so AsyncLocalStorage is not populated.
    // RBAC rows remain gated by fixture.mockRbac in the interceptor above.
    users.set(fixture.userId,fixture);
  }
  return jwt.sign({sub:identity.userId,email:identity.email??`${identity.userId}@test.local`,roles,agencyId:identity.agencyId??null,sid},identity.secret??env.jwt.accessSecret,{algorithm:'HS256',expiresIn:identity.expiresIn??'5m'});
}

export function revokeTestSession(token:string){const payload=jwt.decode(token)as{sid?:string}|null;if(payload?.sid){const fixture=sessions.get(payload.sid);if(fixture)fixture.state='REVOKED'}}
export function clearTestAuthSessions(){sessions.clear();users.clear()}
