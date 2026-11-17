import type {PoolConnection,RowDataPacket} from 'mysql2/promise';
import {HttpError} from '../../shared/http-error.js';

export async function diagnoseHistoricalRefund(connection:PoolConnection,input:{refundId?:string;paymentId?:string}){
 const refundId=input.refundId&&/^[1-9]\d*$/.test(input.refundId)?input.refundId:null,paymentId=input.paymentId&&/^[1-9]\d*$/.test(input.paymentId)?input.paymentId:null;
 if(!refundId&&!paymentId)throw new HttpError(400,'Un identifiant de remboursement ou de paiement est requis');
 const[rows]=await connection.execute<RowDataPacket[]>(`SELECT
   pr.id refund_id,pr.payment_id,pr.invoice_id,pr.credit_note_id,pr.amount refund_amount,pr.reason,pr.refunded_at,
   p.payment_number,p.amount payment_amount,p.status payment_status,p.payment_method_id,
   i.invoice_number,i.agency_id,i.currency_code,i.status invoice_status,
   cn.credit_note_number,cn.status credit_status,cn.amount credit_amount,
   tm.id treasury_movement_id,tm.account_id treasury_account_id,tm.amount treasury_amount,tm.status treasury_status,
   ae.id accounting_entry_id,ae.status accounting_status
  FROM payment_refunds pr
  JOIN payments p ON p.id=pr.payment_id
  JOIN invoices i ON i.id=pr.invoice_id
  LEFT JOIN credit_notes cn ON cn.id=pr.credit_note_id
  LEFT JOIN treasury_movements tm ON tm.source_type='PAYMENT_REFUND' AND tm.source_id=CAST(pr.id AS CHAR) COLLATE utf8mb4_unicode_ci AND tm.event_type='REFUNDED'
  LEFT JOIN accounting_integration_events e ON e.source_key=CONCAT('PAYMENT_REFUNDED:',pr.id)
  LEFT JOIN accounting_entries ae ON ae.id=e.accounting_entry_id
  WHERE (? IS NOT NULL AND pr.id=?) OR (? IS NOT NULL AND pr.payment_id=?)`,[refundId,refundId,paymentId,paymentId]);
 if(!rows.length){
  if(!paymentId)throw new HttpError(404,'Remboursement historique introuvable');
  const[paymentRows]=await connection.execute<RowDataPacket[]>('SELECT p.id,p.payment_number,p.status,p.amount,p.refunded_at,p.refund_reason,i.invoice_number,i.agency_id,i.currency_code FROM payments p JOIN invoices i ON i.id=p.invoice_id WHERE p.id=?',[paymentId]);
  if(!paymentRows[0])throw new HttpError(404,'Paiement historique introuvable');
  return{kind:'LEGACY_PAYMENT_REFUND',decision:'HUMAN_REVIEW_REQUIRED',payment:paymentRows[0],anomalies:['Aucun remboursement normalisé ne porte ce paiement'],safeActions:['Conserver les données en lecture seule','Rassembler la pièce et la décision métier','Ne pas créer rétroactivement un avoir sans validation']};
 }
 return rows.map(row=>{
  const anomalies:string[]=[];
  if(!row.credit_note_id||!row.credit_note_number)anomalies.push('Avoir associé introuvable');
  else if(!['issued','applied'].includes(String(row.credit_status)))anomalies.push(`Avoir au statut incompatible : ${row.credit_status}`);
  if(Number(row.refund_amount)>Number(row.payment_amount))anomalies.push('Montant remboursé supérieur au paiement');
  if(Number(row.refund_amount)>Number(row.credit_amount??0))anomalies.push('Montant remboursé supérieur à l’avoir');
  if(!row.treasury_movement_id)anomalies.push('Mouvement de trésorerie absent');
  else if(Number(row.treasury_amount)!==Number(row.refund_amount)||row.treasury_status!=='POSTED')anomalies.push('Mouvement de trésorerie incohérent');
  if(!row.accounting_entry_id)anomalies.push('Écriture comptable absente');
  return{kind:'NORMALIZED_REFUND',refundId:String(row.refund_id),paymentId:String(row.payment_id),invoiceId:String(row.invoice_id),agencyId:String(row.agency_id),currencyCode:String(row.currency_code),amount:Number(row.refund_amount),creditNoteId:row.credit_note_id?String(row.credit_note_id):null,treasuryMovementId:row.treasury_movement_id?String(row.treasury_movement_id):null,accountingEntryId:row.accounting_entry_id?String(row.accounting_entry_id):null,decision:anomalies.length?'HUMAN_REVIEW_REQUIRED':'CONSISTENT',anomalies,safeActions:anomalies.length?['Ne pas modifier automatiquement','Faire valider la qualification métier et comptable','Utiliser uniquement une contrepassation officielle si elle est décidée']:[]};
 });
}
