import test from 'node:test';
import assert from 'node:assert/strict';
import type { RowDataPacket } from 'mysql2/promise';
import { pool } from '../src/config/database.ts';
import { archiveAccountingEntry,archiveBankStatement,archiveCancellation,archivePartMovement,archivePaymentRefund,archivePurchaseReceipt,archiveRepairHandover,archiveRepairQualityControl,archiveTestDrive,archiveVehicleMovement } from '../src/modules/documents/business-document.service.ts';

test('GED officielle financière: création, empreinte et rejeu idempotent sur lca_recette', { skip: process.env.RUN_DOCUMENT_ARCHIVE_MYSQL !== '1' }, async () => {
  const [[database]] = await pool.query<RowDataPacket[]>('SELECT DATABASE() current_database');
  assert.equal(database?.current_database, 'lca_recette', 'ce test refuse toute base autre que lca_recette');
  const [[actor]] = await pool.query<RowDataPacket[]>('SELECT id FROM users ORDER BY id LIMIT 1');
  assert.ok(actor?.id, 'acteur fictif de recette absent');
  await pool.query(`INSERT IGNORE INTO payments(payment_number,invoice_id,customer_id,payment_method_id,treasury_account_id,received_by,amount,payment_date,reference,status,notes,idempotency_key)
    SELECT 'GED-ARCH-CANCEL',invoice_id,customer_id,payment_method_id,treasury_account_id,?,1,NOW(),'GED-ARCH-CANCEL','confirmed','Fixture GED documentaire','ged-archive-payment-cancel-v1'
    FROM payments ORDER BY id LIMIT 1`,[actor.id]);
  await pool.query(`INSERT IGNORE INTO payment_cancellations(payment_id,invoice_id,reason,idempotency_key,cancelled_by)
    SELECT p.id,p.invoice_id,'Fixture annulation GED','ged-archive-payment-cancellation-v1',?
    FROM payments p WHERE p.idempotency_key='ged-archive-payment-cancel-v1'`,[actor.id]);
  const [refunds] = await pool.query<RowDataPacket[]>('SELECT id FROM payment_refunds ORDER BY id LIMIT 1');
  const [paymentCancellations] = await pool.query<RowDataPacket[]>('SELECT payment_id id FROM payment_cancellations ORDER BY id LIMIT 1');
  const [invoices] = await pool.query<RowDataPacket[]>("SELECT id FROM invoices WHERE status='cancelled' ORDER BY id LIMIT 1");
  const [sales] = await pool.query<RowDataPacket[]>("SELECT id FROM sales WHERE status='cancelled' ORDER BY id LIMIT 1");
  const cases = [
    refunds[0] && { key:`payment-refund:${refunds[0].id}:finalized:v1`, run:()=>archivePaymentRefund(String(refunds[0].id),String(actor.id)) },
    paymentCancellations[0] && { key:`cancellation:payment:${paymentCancellations[0].id}:finalized:v1`, run:()=>archiveCancellation('payment',String(paymentCancellations[0].id),String(actor.id)) },
    invoices[0] && { key:`cancellation:invoice:${invoices[0].id}:finalized:v1`, run:()=>archiveCancellation('invoice',String(invoices[0].id),String(actor.id)) },
    sales[0] && { key:`cancellation:sale:${sales[0].id}:finalized:v1`, run:()=>archiveCancellation('sale',String(sales[0].id),String(actor.id)) },
    {key:'showroom-test-drive:9001:completed:v1',run:()=>archiveTestDrive('9001',String(actor.id))},
    {key:'vehicle-movement:9001:posted:v1',run:()=>archiveVehicleMovement('9001',String(actor.id))},
    {key:'parts-purchase-receipt:9001:finalized:v1',run:()=>archivePurchaseReceipt('9001',String(actor.id))},
    {key:'part-movement:9001:posted:v1',run:()=>archivePartMovement('9001',String(actor.id))},
    {key:'accounting-entry:9001:posted:v1',run:()=>archiveAccountingEntry('9001',String(actor.id))},
    {key:'bank-statement:9001:validated:v1',run:()=>archiveBankStatement('9001',String(actor.id))},
    {key:'repair-order:9001:quality-control:9001:v1',run:()=>archiveRepairQualityControl('9001',String(actor.id))},
    {key:'repair-order:9001:handover:9001:v1',run:()=>archiveRepairHandover('9001',String(actor.id))},
  ].filter(Boolean) as Array<{key:string;run:()=>Promise<{id:string;created:boolean}>}>;
  assert.equal(cases.length,12,'fixtures finalisées ABS/GED incomplètes');
  for (const item of cases) {
    const first = await item.run();
    const second = await item.run();
    assert.equal(second.id, first.id);
    assert.equal(second.created, false);
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id,origin,source_key,agency_id,uploaded_by,file_hash,version,is_archived,mime_type,file_size FROM documents WHERE source_key=?',[item.key]);
    assert.equal(rows.length,1);
    assert.equal(String(rows[0].id),first.id);
    assert.equal(rows[0].origin,'generated');
    assert.equal(rows[0].source_key,item.key);
    assert.equal(String(rows[0].uploaded_by),String(actor.id));
    assert.match(String(rows[0].file_hash),/^[a-f0-9]{64}$/);
    assert.equal(Number(rows[0].version),1);
    assert.equal(Number(rows[0].is_archived),0);
    assert.equal(rows[0].mime_type,'application/pdf');
    assert.ok(Number(rows[0].file_size)>100);
  }
  await pool.end();
});
