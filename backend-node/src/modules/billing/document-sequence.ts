import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { HttpError } from '../../shared/http-error.js';

export type DocumentType = 'FAC' | 'REG' | 'AVO';

export async function nextDocumentNumber(connection: PoolConnection, documentType: DocumentType, agencyId: string) {
  const year = new Date().getFullYear();
  await connection.execute(
    'INSERT INTO document_sequences(document_type,agency_id,sequence_year,last_number) VALUES(?,?,?,1) ON DUPLICATE KEY UPDATE last_number=last_number+1',
    [documentType, agencyId, year],
  );
  const [rows] = await connection.execute<RowDataPacket[]>(
    'SELECT ds.last_number,a.code FROM document_sequences ds JOIN agencies a ON a.id=ds.agency_id WHERE ds.document_type=? AND ds.agency_id=? AND ds.sequence_year=? FOR UPDATE',
    [documentType, agencyId, year],
  );
  const row = rows[0];
  if (!row) throw new HttpError(500, 'Séquence documentaire indisponible');
  const agencyCode = String(row.code ?? agencyId).replace(/[^A-Z0-9]/gi, '').toUpperCase();
  return `${documentType}-${agencyCode}-${year}-${String(row.last_number).padStart(6, '0')}`;
}
