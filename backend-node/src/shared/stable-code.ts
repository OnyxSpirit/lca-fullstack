import type { ResultSetHeader } from 'mysql2/promise';

export function stableCodeBase(value: unknown, maxLength = 80) {
  const normalized = String(value ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return (normalized || 'REFERENCE').slice(0, maxLength).replace(/_+$/g, '') || 'REFERENCE';
}

export async function insertWithStableCode(insert: (code: string) => Promise<ResultSetHeader>, name: unknown, maxLength = 80) {
  const base = stableCodeBase(name, maxLength);
  for (let sequence = 1; sequence <= 100; sequence += 1) {
    const suffix = sequence === 1 ? '' : `_${sequence}`;
    const code = `${base.slice(0, maxLength - suffix.length).replace(/_+$/g, '')}${suffix}`;
    try { return { result: await insert(code), code }; }
    catch (error: any) { if (error?.code !== 'ER_DUP_ENTRY') throw error; }
  }
  const error: any = new Error('Impossible de générer un code unique'); error.code = 'ER_DUP_ENTRY'; throw error;
}
