import argon2 from 'argon2';
import type {Pool,ResultSetHeader,RowDataPacket} from 'mysql2/promise';
import {provisionDefaultWorkshopLaborRates} from './workshop-labor-rate-provisioning.js';

export type AdminProvisioningConfig={email:string;password:string;rotatePassword:boolean};
export type AdminProvisioningResult={userId:string;action:'created'|'unchanged'|'password_rotated'};

const rejectedSecrets=[
  'admin','admin123','password','password123','123456','123456789012','changeme','change_me','superadmin','default',
];

export function adminProvisioningConfig(environment:NodeJS.ProcessEnv):AdminProvisioningConfig {
  const email=environment.ADMIN_EMAIL?.trim().toLowerCase();
  if(!email)throw new Error('ADMIN_EMAIL est obligatoire');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||/replace[_-]?with|change[_-]?me|example/i.test(email))throw new Error('ADMIN_EMAIL doit être une adresse explicite valide');
  const password=environment.ADMIN_PASSWORD;
  if(!password)throw new Error('ADMIN_PASSWORD est obligatoire');
  validateAdminPassword(password,email);
  const rotation=environment.ADMIN_ROTATE_PASSWORD;
  if(rotation!=null&&rotation!==''&&!['true','false'].includes(rotation))throw new Error('ADMIN_ROTATE_PASSWORD accepte uniquement true ou false');
  return{email,password,rotatePassword:rotation==='true'};
}

export function validateAdminPassword(password:string,email:string){
  const normalized=password.trim().toLowerCase(),local=email.split('@')[0]!.toLowerCase();
  if(password.length<12)throw new Error('ADMIN_PASSWORD doit contenir au moins 12 caractères');
  if(password!==password.trim())throw new Error('ADMIN_PASSWORD ne doit pas commencer ou finir par un espace');
  if(rejectedSecrets.includes(normalized)||/replace[_-]?with|change[_-]?me|default|example|password|superadmin/i.test(normalized)||/^\d+$/.test(normalized)||/^(.)\1+$/.test(password)||normalized===email.toLowerCase()||normalized===local)throw new Error('ADMIN_PASSWORD est trop faible ou correspond à une valeur interdite');
}

export async function provisionAdmin(pool:Pool,config:AdminProvisioningConfig):Promise<AdminProvisioningResult>{
  const connection=await pool.getConnection();
  let locked=false;
  try{
    const[locks]=await connection.execute<RowDataPacket[]>("SELECT GET_LOCK('lca:provision-super-admin',30) acquired");
    if(Number(locks[0]?.acquired)!==1)throw new Error('Provisioning Super Admin déjà en cours');
    locked=true;
    await connection.beginTransaction();
    const[group]=await connection.execute<ResultSetHeader>(`INSERT INTO groups_company(name,code) VALUES('LCA Groupe','LCA') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`);
    const[concession]=await connection.execute<ResultSetHeader>(`INSERT INTO concessions(group_id,name,code,country) VALUES(?,'LCA Concession','LCA-CG','Congo') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,[group.insertId]);
    const[agency]=await connection.execute<ResultSetHeader>(`INSERT INTO agencies(concession_id,name,code,city,is_active) VALUES(?,'Agence principale','LCA-BZV','Brazzaville',TRUE) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,[concession.insertId]);
    await connection.execute(`INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description) VALUES ('concession',?,'billing.default_vat_rate',JSON_EXTRACT('18.9','$'),'TVA par défaut'),('concession',?,'workshop.rate_t1',JSON_EXTRACT('35000','$'),'Tarif atelier T1'),('concession',?,'workshop.rate_t2',JSON_EXTRACT('45000','$'),'Tarif atelier T2'),('concession',?,'workshop.rate_t3',JSON_EXTRACT('55000','$'),'Tarif atelier T3'),('concession',?,'workshop.rate_t4',JSON_EXTRACT('45000','$'),'Tarif atelier T4') ON DUPLICATE KEY UPDATE setting_value=settings.setting_value`,[concession.insertId,concession.insertId,concession.insertId,concession.insertId,concession.insertId]);
    await provisionDefaultWorkshopLaborRates(connection,concession.insertId);
    const[roles]=await connection.execute<RowDataPacket[]>(`SELECT id FROM roles WHERE code='SUPER_ADMIN' AND is_system=TRUE AND is_active=TRUE LIMIT 1 FOR UPDATE`),role=roles[0];
    if(!role)throw new Error('Rôle système SUPER_ADMIN actif absent');
    await connection.execute(`INSERT IGNORE INTO role_permissions(role_id,permission_id,scope)
      SELECT ?,p.id,'GLOBAL' FROM permissions p WHERE p.is_active=TRUE`,[role.id]);
    const[existingAdmins]=await connection.execute<RowDataPacket[]>(`SELECT u.id,u.email FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.code='SUPER_ADMIN' AND r.is_system=TRUE FOR UPDATE`);
    const[targetRows]=await connection.execute<RowDataPacket[]>('SELECT id,password_hash,is_active FROM users WHERE email=? LIMIT 1 FOR UPDATE',[config.email]),target=targetRows[0];
    let result:AdminProvisioningResult;
    if(target){
      const isSystemAdmin=existingAdmins.some(row=>String(row.id)===String(target.id));
      if(!isSystemAdmin)throw new Error('ADMIN_EMAIL appartient déjà à un utilisateur non Super Admin système');
      if(config.rotatePassword){
        await connection.execute('UPDATE users SET password_hash=? WHERE id=?',[await argon2.hash(config.password),target.id]);
        await connection.execute('UPDATE refresh_tokens SET revoked_at=NOW() WHERE user_id=? AND revoked_at IS NULL',[target.id]);
        result={userId:String(target.id),action:'password_rotated'};
      }else result={userId:String(target.id),action:'unchanged'};
    }else{
      if(existingAdmins.length)throw new Error('Un Super Admin système existe déjà avec un autre email');
      const[user]=await connection.execute<ResultSetHeader>(`INSERT INTO users(agency_id,first_name,last_name,email,password_hash,job_title,is_active) VALUES(?,'Super','Administrateur',?,?,'Super Administrateur',TRUE)`,[agency.insertId,config.email,await argon2.hash(config.password)]);
      await connection.execute('INSERT INTO user_roles(user_id,role_id) VALUES(?,?)',[user.insertId,role.id]);
      result={userId:String(user.insertId),action:'created'};
    }
    await connection.commit();
    return result;
  }catch(error){await connection.rollback();throw error}
  finally{if(locked)await connection.execute("SELECT RELEASE_LOCK('lca:provision-super-admin')").catch(()=>undefined);connection.release()}
}
