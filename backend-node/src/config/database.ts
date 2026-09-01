import { createPool, type PoolConnection, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';
import { env } from './env.js';

export const pool = createPool({
  host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, database: env.db.database,
  waitForConnections: true, connectionLimit: env.db.poolSize, queueLimit: 0, charset: 'utf8mb4',
  supportBigNumbers: true, bigNumberStrings: true, dateStrings: true,
});

export async function query<T extends RowDataPacket[]>(sql: string, params: any[] = []): Promise<T> {
  const [rows] = await pool.execute<T>(sql, params);
  return rows;
}

export async function execute(sql: string, params: any[] = []): Promise<ResultSetHeader> {
  const [result] = await pool.execute<ResultSetHeader>(sql, params);
  return result;
}

export async function transaction<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
  const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const value = await work(connection); await connection.commit(); return value; }
  catch (error) { await connection.rollback(); throw error; }
  finally { connection.release(); }
}
