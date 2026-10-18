import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { after, test } from 'node:test';
import supertest from 'supertest';
import type { RowDataPacket } from 'mysql2/promise';
import { createApp } from '../src/app.js';
import { execute, pool, query } from '../src/config/database.js';
import { createMysqlActor, ensureMysqlHttpAdministrator, issueMysqlAccessToken } from './helpers/mysql-auth-session-fixture.js';

const enabled = process.env.LCA_B321_MARKS_TEST === '1';
if (enabled) after(() => pool.end());
const api = supertest(createApp());
const auth = (token: string, request: supertest.Test) => request.set('Authorization', `Bearer ${token}`);

let crcTable: number[] | null = null;
const crc = (buffer: Buffer) => {
  crcTable ??= Array.from({ length: 256 }, (_, n) => {
    let value = n;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 255]! ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
};
const chunk = (name: string, data: Buffer) => {
  const type = Buffer.from(name), output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length); type.copy(output, 4); data.copy(output, 8);
  output.writeUInt32BE(crc(Buffer.concat([type, data])), 8 + data.length);
  return output;
};
const png = () => {
  const width = 120, height = 60, header = Buffer.alloc(13), raw = Buffer.alloc((width * 3 + 1) * height, 245);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 2;
  for (let y = 0; y < height; y += 1) raw[y * (width * 3 + 1)] = 0;
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]), chunk('IHDR', header), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};

test('B3.2.1 persistance multi-documents, HTTP, audit et RBAC sur MySQL 8.4', { skip: !enabled, timeout: 120000 }, async () => {
  const permissions = ['stamp.view','stamp.manage','stamp.use','signature.view.self','signature.manage.self','document.signature.apply'];
  const admin = await ensureMysqlHttpAdministrator(permissions);
  const image = png();
  const created = await auth(admin.accessToken, api.post('/api/document-marks/stamps'))
    .field('name', 'Cachet multi-documents B321')
    .field('agencyId', admin.agencyId)
    .field('documentContexts', JSON.stringify(['QUOTATION','INVOICE']))
    .attach('file', image, { filename: 'cachet-b321.png', contentType: 'image/png' });
  assert.equal(created.status, 201, created.text);
  const stampId = String(created.body.id);
  assert.deepEqual(created.body.documentContexts, ['QUOTATION','INVOICE']);

  const mappings = await query<RowDataPacket[]>('SELECT document_type FROM service_stamp_document_types WHERE stamp_id=? ORDER BY document_type', [stampId]);
  assert.deepEqual(mappings.map(row => row.document_type), ['INVOICE','QUOTATION']);
  const firstRead = await auth(admin.accessToken, api.get('/api/document-marks/stamps'));
  assert.equal(firstRead.status, 200, firstRead.text);
  assert.deepEqual(new Set(firstRead.body.find((stamp: any) => String(stamp.id) === stampId).documentContexts), new Set(['QUOTATION','INVOICE']));

  const changed = await auth(admin.accessToken, api.patch(`/api/document-marks/stamps/${stampId}/document-types`))
    .send({ documentContexts: ['INVOICE','DELIVERY_REPORT','INVOICE'] });
  assert.equal(changed.status, 200, changed.text);
  const afterChange = await query<RowDataPacket[]>('SELECT document_type FROM service_stamp_document_types WHERE stamp_id=? ORDER BY document_type', [stampId]);
  assert.deepEqual(afterChange.map(row => row.document_type), ['DELIVERY_REPORT','INVOICE']);
  const [legacy] = await query<RowDataPacket[]>('SELECT document_context FROM service_stamps WHERE id=?', [stampId]);
  assert.equal(legacy!.document_context, 'INVOICE');
  const [audit] = await query<RowDataPacket[]>("SELECT old_values,new_values FROM audit_logs WHERE entity_type='service_stamp' AND entity_id=? AND action='stamp.document_types.updated' ORDER BY id DESC LIMIT 1", [stampId]);
  assert.ok(audit);
  assert.match(JSON.stringify(audit!.new_values), /DELIVERY_REPORT/);

  const reconnected = await issueMysqlAccessToken({ userId: admin.userId, email: admin.email, agencyId: admin.agencyId });
  const secondRead = await auth(reconnected.accessToken, api.get('/api/document-marks/stamps'));
  assert.equal(secondRead.status, 200, secondRead.text);
  assert.deepEqual(new Set(secondRead.body.find((stamp: any) => String(stamp.id) === stampId).documentContexts), new Set(['INVOICE','DELIVERY_REPORT']));

  const unsupported = await auth(admin.accessToken, api.patch(`/api/document-marks/stamps/${stampId}/document-types`)).send({ documentContexts: ['REPAIR_ORDER'] });
  assert.equal(unsupported.status, 400, unsupported.text);
  assert.equal(Number((await query<RowDataPacket[]>('SELECT COUNT(*) total FROM service_stamp_document_types WHERE stamp_id=?', [stampId]))[0]!.total), 2);
  const explicitWorkflow = await auth(admin.accessToken, api.put('/api/document-marks/policies/DELIVERY_REPORT')).send({ signatureRequired: true, stampRequired: true, missingMarkBehavior: 'BLOCK', isActive: true });
  assert.equal(explicitWorkflow.status, 409, explicitWorkflow.text);

  const viewer = await createMysqlActor({ label: 'B321 viewer', agencyId: admin.agencyId, permissions: [{ code: 'stamp.view', scope: 'AGENCY' }] });
  assert.equal((await auth(viewer.accessToken, api.patch(`/api/document-marks/stamps/${stampId}/document-types`)).send({ documentContexts: ['INVOICE'] })).status, 403);
  const [agency] = await query<RowDataPacket[]>('SELECT concession_id FROM agencies WHERE id=?', [admin.agencyId]);
  const foreignAgency = await execute('INSERT INTO agencies(concession_id,name,code,is_active) VALUES(?,?,?,TRUE)', [agency!.concession_id, 'Agence B321 étrangère', `B321-${Date.now()}`]);
  const agencyManager = await createMysqlActor({ label: 'B321 agency manager', agencyId: admin.agencyId, permissions: permissions.map(code => ({ code, scope: 'AGENCY' as const })) });
  const crossScope = await auth(agencyManager.accessToken, api.post('/api/document-marks/stamps'))
    .field('name', 'Cachet hors périmètre').field('agencyId', String(foreignAgency.insertId)).field('documentContexts', JSON.stringify(['INVOICE']))
    .attach('file', image, { filename: 'cross.png', contentType: 'image/png' });
  assert.equal(crossScope.status, 403, crossScope.text);

  assert.equal((await auth(admin.accessToken, api.patch(`/api/document-marks/stamps/${stampId}/status`)).send({ isActive: false })).status, 200);
  const inactivePolicy = await auth(admin.accessToken, api.put('/api/document-marks/policies/INVOICE')).send({ signatureRequired: false, stampRequired: true, missingMarkBehavior: 'BLOCK', defaultStampId: stampId, isActive: true });
  assert.equal(inactivePolicy.status, 400, inactivePolicy.text);
  assert.equal((await auth(admin.accessToken, api.patch(`/api/document-marks/stamps/${stampId}/status`)).send({ isActive: true })).status, 200);
  const revoked = await auth(admin.accessToken, api.post(`/api/document-marks/stamps/${stampId}/revoke`)).send({ reason: 'Fin de recette B.3.2.1' });
  assert.equal(revoked.status, 200, revoked.text);
  const revokedPolicy = await auth(admin.accessToken, api.put('/api/document-marks/policies/INVOICE')).send({ signatureRequired: false, stampRequired: true, missingMarkBehavior: 'BLOCK', defaultStampId: stampId, isActive: true });
  assert.equal(revokedPolicy.status, 400, revokedPolicy.text);
});
