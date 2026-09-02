import { createPool } from 'mysql2/promise';
import { env } from './env.js';
export const pool = createPool({
    host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, database: env.db.database,
    waitForConnections: true, connectionLimit: env.db.poolSize, queueLimit: 0, charset: 'utf8mb4',
    supportBigNumbers: true, bigNumberStrings: true, dateStrings: true,
});
export async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}
export async function execute(sql, params = []) {
    const [result] = await pool.execute(sql, params);
    return result;
}
export async function transaction(work) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const value = await work(connection);
        await connection.commit();
        return value;
    }
    catch (error) {
        await connection.rollback();
        throw error;
    }
    finally {
        connection.release();
    }
}
