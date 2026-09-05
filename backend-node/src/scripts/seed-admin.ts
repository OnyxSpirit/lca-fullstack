import argon2 from 'argon2';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from '../config/database.js';

const email=process.env.ADMIN_EMAIL??'admin@lca.local';
const password=process.env.ADMIN_PASSWORD;
if(!password||password.length<12)throw new Error('ADMIN_PASSWORD doit contenir au moins 12 caractères');
const connection=await pool.getConnection();
try{await connection.beginTransaction();const[group]=await connection.execute<ResultSetHeader>(`INSERT INTO groups_company(name,code)VALUES('LCA Groupe','LCA') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`);const[concession]=await connection.execute<ResultSetHeader>(`INSERT INTO concessions(group_id,name,code,country)VALUES(?,'LCA Concession','LCA-CG','Congo') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,[group.insertId]);const[agency]=await connection.execute<ResultSetHeader>(`INSERT INTO agencies(concession_id,name,code,city,is_active)VALUES(?,'Agence principale','LCA-BZV','Brazzaville',TRUE) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`,[concession.insertId]);await connection.execute(`INSERT INTO settings(scope_type,scope_id,setting_key,setting_value,description) VALUES
('concession',?,'billing.default_vat_rate',JSON_EXTRACT('18.9','$'),'TVA par défaut'),
('concession',?,'workshop.rate_t1',JSON_EXTRACT('35000','$'),'Tarif atelier T1'),
('concession',?,'workshop.rate_t2',JSON_EXTRACT('45000','$'),'Tarif atelier T2'),
('concession',?,'workshop.rate_t3',JSON_EXTRACT('55000','$'),'Tarif atelier T3'),
('concession',?,'workshop.rate_t4',JSON_EXTRACT('45000','$'),'Tarif atelier T4')
ON DUPLICATE KEY UPDATE setting_value=settings.setting_value`,[concession.insertId,concession.insertId,concession.insertId,concession.insertId,concession.insertId]);const hash=await argon2.hash(password);const[user]=await connection.execute<ResultSetHeader>(`INSERT INTO users(agency_id,first_name,last_name,email,password_hash,job_title,is_active)VALUES(?,'Super','Administrateur',?,?,'Super Administrateur',TRUE) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),password_hash=VALUES(password_hash),is_active=TRUE`,[agency.insertId,email,hash]);const[roles]=await connection.execute<RowDataPacket[]>(`SELECT id FROM roles WHERE code='SUPER_ADMIN' LIMIT 1`);if(!roles[0])throw new Error('Rôle SUPER_ADMIN absent');await connection.execute('INSERT IGNORE INTO user_roles(user_id,role_id)VALUES(?,?)',[user.insertId,roles[0].id]);await connection.commit();console.log(`Administrateur créé: ${email}`);}catch(error){await connection.rollback();throw error;}finally{connection.release();await pool.end();}
