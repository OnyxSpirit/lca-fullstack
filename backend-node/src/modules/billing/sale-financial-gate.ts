import type{PoolConnection,RowDataPacket}from'mysql2/promise';
import{HttpError}from'../../shared/http-error.js';
import{assertFinanciallySettled}from'./payment.domain.js';

type FinancialGate='preparation'|'ready_for_delivery'|'delivery';
type ActiveInvoice={id:unknown;status:unknown;amount_paid:unknown;balance_due:unknown};

export function assertActiveInvoiceFinancialClearance(invoice:ActiveInvoice|undefined,gate:FinancialGate){
  if(!invoice){
    const message=gate==='preparation'?'Une facture émise et intégralement réglée est requise avant de lancer la préparation.':gate==='ready_for_delivery'?'Une facture active est requise avant la mise en livraison':'La facture de vente est absente';
    throw new HttpError(409,message);
  }
  if(String(invoice.status)!=='paid'){
    if(gate==='preparation')throw new HttpError(409,"La préparation ne peut pas être lancée tant que la facture n'est pas émise et intégralement réglée.");
    if(gate==='ready_for_delivery')throw new HttpError(409,'La vente doit être entièrement réglée avant de pouvoir être déclarée prête à livrer');
    throw new HttpError(409,"La livraison est impossible tant que la facture n'est pas intégralement réglée.");
  }
  assertFinanciallySettled(invoice.balance_due,gate==='delivery'?'livraison':'vente');
  return invoice;
}

export async function lockActiveSaleInvoice(connection:PoolConnection,saleId:string,gate:FinancialGate){
  const[rows]=await connection.execute<RowDataPacket[]>("SELECT id,status,amount_paid,balance_due FROM invoices WHERE sale_id=? AND status<>'cancelled' ORDER BY id DESC LIMIT 1 FOR UPDATE",[saleId]);
  return assertActiveInvoiceFinancialClearance(rows[0] as ActiveInvoice|undefined,gate);
}
