import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pool } from '../config/database.js';

const migrationPath = resolve(process.cwd(), '../backend/database/migrations/018_billing_stabilization.sql');
const sql = await readFile(migrationPath, 'utf8');
const statements = sql
  .split(';')
  .map((statement) => statement.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

try {
  for (const statement of statements) await pool.query(statement);
  console.log(`Migration Billing appliquée sans suppression : ${migrationPath}`);
} finally {
  await pool.end();
}
