import {createHash,randomUUID} from 'node:crypto';
import jwt, {type SignOptions} from 'jsonwebtoken';
import argon2 from 'argon2';
import type {ResultSetHeader,RowDataPacket} from 'mysql2/promise';
import {env} from '../../src/config/env.js';
import {execute,pool,query} from '../../src/config/database.js';

export type MysqlPermissionScope='OWN'|'AGENCY'|'CONCESSION'|'GLOBAL';

export type MysqlSessionOptions={
  userId:string;
  email:string;
  agencyId?:string|null;
  expiresIn?:SignOptions['expiresIn'];
  sessionExpiresAt?:Date;
  revoked?:boolean;
  twoFactorVerified?:boolean;
};

export type MysqlActorOptions={
  label:string;
  agencyId:string;
  email?:string;
  permissions:ReadonlyArray<{code:string;scope:MysqlPermissionScope}>;
  passwordHash?:string;
  twoFactorVerified?:boolean;
};

export const workshopPartsHttpPermissions=[
  'customers.view','customers.create','customers.update','vehicles.view','vehicles.create','vehicles.update',
  'service.order.view','service.order.create','service.order.update','service.order.receive','service.order.diagnose',
  'service.order.approve','service.order.advance','service.order.assign_advisor','service.order.assign_technician',
  'service.order.abandon','service.order.cancel','service.order.close','service.order.handover','service.order.invoice',
  'service.order.quality_control','service.order.ready','workshop.view','workshop.plan','workshop.assign_bay',
  'workshop.assign_technician','workshop.bay.manage','workshop.bay.view','workshop.intervention.assign',
  'workshop.intervention.update','workshop.intervention.view','workshop.resources.manage','workshop.resources.view',
  'workshop.schedule.manage','workshop.schedule.view','workshop.session.manage','workshop.session.track',
  'workshop.session.view','workshop.technicians.manage','workshop.technicians.view','workshop.time.adjust',
  'workshop.time.view','parts.catalog.manage','parts.catalog.view','parts.inventory.manage','parts.inventory.view',
  'parts.purchase_order.approve','parts.purchase_order.create','parts.purchase_order.receive',
  'parts.purchase_order.update','parts.purchase_order.view','parts.reservation.consume','parts.reservation.create',
  'parts.reservation.release','parts.reservation.view','parts.stock.adjust','parts.stock.manage','parts.stock.move',
  'parts.stock.view','parts.suppliers.manage','parts.suppliers.view','parts.view','billing.invoice.create',
  'billing.invoice.issue','billing.invoice.update','billing.invoice.view','billing.payment.collect','billing.payment.view',
  'settings.view','settings.update',
] as const;

export const legacyHttpIntegrationPermissions=[...workshopPartsHttpPermissions,
  'billing.export','billing.invoice.cancel','billing.payment.refund','roles.create','roles.delete','roles.disable',
  'roles.permissions.manage','roles.update','roles.view','users.assign_agency','users.assign_role','users.create',
  'users.disable','users.reset_password','users.update','users.view','crm.prospect.create','crm.prospect.update',
  'crm.prospect.view','crm.test_drive.create','showroom.view','showroom.visitor.create','showroom.visitor.update',
  'settings.manufacturers.create','settings.manufacturers.disable','settings.manufacturers.update','settings.manufacturers.view',
  'service.warranty.manage','service.warranty.approve',
] as const;

export async function issueMysqlAccessToken(options:MysqlSessionOptions){
  const sid=randomUUID();
  const expiresAt=options.sessionExpiresAt??new Date(Date.now()+60*60*1000);
  const tokenHash=createHash('sha256').update(`fixture:${sid}`).digest('hex');
  await execute(
    `INSERT INTO refresh_tokens(
       id,user_id,token_hash,expires_at,revoked_at,two_factor_verified_at,
       strong_auth_at,strong_auth_method,two_factor_grandfathered
     ) VALUES(?,?,?,?,?,?,?,? ,?)`,
    [sid,options.userId,tokenHash,expiresAt,options.revoked?new Date():null,
      options.twoFactorVerified===false?null:new Date(),
      options.twoFactorVerified===false?null:new Date(),
      options.twoFactorVerified===false?null:'PASSWORD_TOTP',
      options.twoFactorVerified===false?1:0],
  );
  const accessToken=jwt.sign({
    sub:options.userId,sid,email:options.email,roles:[],agencyId:options.agencyId??null,
  },env.jwt.accessSecret,{algorithm:'HS256',expiresIn:options.expiresIn??'15m'});
  return{sid,accessToken};
}

export async function createMysqlActor(options:MysqlActorOptions){
  const suffix=randomUUID().replaceAll('-','').slice(0,12);
  const code=`B31_${options.label.replace(/[^A-Za-z0-9]+/g,'_').toUpperCase()}_${suffix}`.slice(0,80);
  const roleResult=await execute(
    'INSERT INTO roles(name,code,is_system,is_active) VALUES(?,?,FALSE,TRUE)',
    [`B31 ${options.label} ${suffix}`,code],
  );
  const roleId=String(roleResult.insertId);
  for(const permission of options.permissions){
    const[row]=await query<RowDataPacket[]>('SELECT id FROM permissions WHERE code=? AND is_active=TRUE',[permission.code]);
    if(!row)throw new Error(`Permission de fixture introuvable: ${permission.code}`);
    await pool.execute('INSERT INTO role_permissions(role_id,permission_id,scope) VALUES(?,?,?)',[roleId,row.id,permission.scope]);
  }
  const email=options.email??`b31-${options.label.toLowerCase().replace(/[^a-z0-9]+/g,'-')}-${suffix}@test.local`;
  const userResult=await execute(
    'INSERT INTO users(agency_id,first_name,last_name,email,password_hash,is_active) VALUES(?,?,?,?,?,TRUE)',
    [options.agencyId,'B31',options.label,email,options.passwordHash??'fixture-not-used'],
  );
  const userId=String((userResult as ResultSetHeader).insertId);
  await pool.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[userId,roleId]);
  const session=await issueMysqlAccessToken({userId,email,agencyId:options.agencyId,twoFactorVerified:options.twoFactorVerified});
  return{userId,roleId,email,...session};
}

export async function ensureMysqlHttpAdministrator(permissionCodes:ReadonlyArray<string>){
  const suffix=randomUUID().replaceAll('-','').slice(0,12);
  let[group]=await query<RowDataPacket[]>('SELECT id FROM groups_company ORDER BY id LIMIT 1');
  if(!group){const created=await execute('INSERT INTO groups_company(name,code) VALUES(?,?)',[`Groupe B31 ${suffix}`,`GB31${suffix}`.slice(0,30)]);group={id:created.insertId} as RowDataPacket}
  const[agency]=await query<RowDataPacket[]>("SELECT id FROM agencies WHERE code='LCA-BZV' AND is_active=TRUE LIMIT 1");
  let fallback=agency??(await query<RowDataPacket[]>('SELECT id FROM agencies WHERE is_active=TRUE ORDER BY id LIMIT 1'))[0];
  if(!fallback){
    const concession=await execute('INSERT INTO concessions(group_id,name,code,currency_code) VALUES(?,?,?,?)',[group.id,`B31 ${suffix}`,`B31${suffix}`.slice(0,30),'XAF']);
    const created=await execute('INSERT INTO agencies(concession_id,name,code,is_active) VALUES(?,?,?,TRUE)',[concession.insertId,'Agence B31','LCA-BZV']);
    fallback={id:created.insertId} as RowDataPacket;
  }
  const agencyId=String(fallback.id),email=`b31-http-admin-${suffix}@test.local`,password=`B31-${suffix}-Admin!`;
  const actor=await createMysqlActor({
    label:`HTTP ${suffix}`,agencyId,email,passwordHash:await argon2.hash(password),
    permissions:[...new Set(permissionCodes)].map(code=>({code,scope:'GLOBAL' as const})),
  });
  process.env.ADMIN_EMAIL=email;
  process.env.ADMIN_PASSWORD=password;
  return{...actor,email,password,agencyId};
}
