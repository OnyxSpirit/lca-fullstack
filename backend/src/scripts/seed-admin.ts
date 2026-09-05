import { createConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import * as argon2 from 'argon2';

async function main() {
  const connection = await createConnection({
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? 'lca_user',
    password: process.env.DB_PASSWORD ?? 'lca_password',
    database: process.env.DB_NAME ?? 'concession_erp',
  });
  const email = process.env.ADMIN_EMAIL ?? 'admin@lca.local';
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe@2026';
  await connection.beginTransaction();
  try {
    const [group] = await connection.execute<ResultSetHeader>(`INSERT INTO groups_company(name,code) VALUES('LCA Groupe','LCA') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`);
    const [concession] = await connection.execute<ResultSetHeader>(`INSERT INTO concessions(group_id,name,code,country) VALUES(?,'LCA Concession','LCA-CG','Congo') ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`, [group.insertId]);
    const [agency] = await connection.execute<ResultSetHeader>(`INSERT INTO agencies(concession_id,name,code,city,is_active) VALUES(?,'Agence principale','LCA-BZV','Brazzaville',TRUE) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)`, [concession.insertId]);
    const passwordHash = await argon2.hash(password);
    const [user] = await connection.execute<ResultSetHeader>(`INSERT INTO users(agency_id,first_name,last_name,email,password_hash,job_title,is_active) VALUES(?,'Super','Administrateur',?,?, 'Super Administrateur',TRUE) ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id),password_hash=VALUES(password_hash),is_active=TRUE`, [agency.insertId,email,passwordHash]);
    const [roles] = await connection.execute<RowDataPacket[]>(`SELECT id FROM roles WHERE code='SUPER_ADMIN' LIMIT 1`);
    if (!roles[0]) throw new Error('Le rôle SUPER_ADMIN est absent. Exécutez schema.sql avant le seed.');
    await connection.execute('INSERT IGNORE INTO user_roles(user_id,role_id) VALUES(?,?)', [user.insertId,roles[0].id]);
    await connection.commit();
    console.log(`Administrateur créé: ${email}`);
  } catch (error) { await connection.rollback(); throw error; }
  finally { await connection.end(); }
}
void main();
