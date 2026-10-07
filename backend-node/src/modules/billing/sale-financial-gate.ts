import type{PoolConnection,RowDataPacket}from'mysql2/promise';
import{HttpError}from'../../shared/http-error.js';
import{assertFinanciallySettled}from'./payment.domain.js';

type FinancialGate='preparation'|'ready_for_delivery'|'delivery';
type ActiveInvoice={id:unknown;status:unknown;total?:unknown;amount_paid:unknown;balance_due:unknown;currency_code?:unknown};
export type DeliveryFinancialEligibility={invoice:ActiveInvoice;authorization?:RowDataPacket;financiallyCleared:boolean;coveredByAuthorization:boolean};

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
  const[rows]=await connection.execute<RowDataPacket[]>("SELECT id,status,total,amount_paid,balance_due,currency_code FROM invoices WHERE sale_id=? AND status<>'cancelled' ORDER BY id DESC LIMIT 1 FOR UPDATE",[saleId]);
  const invoice=rows[0] as ActiveInvoice|undefined;
  if(!invoice)return assertActiveInvoiceFinancialClearance(invoice,gate);
  if(String(invoice.status)==='draft')return assertActiveInvoiceFinancialClearance(invoice,gate);
  const balance=Number(invoice.balance_due);
  if(balance<=.001)return{invoice,financiallyCleared:true,coveredByAuthorization:false} satisfies DeliveryFinancialEligibility;
  const[authorizations]=await connection.execute<RowDataPacket[]>("SELECT * FROM delivery_financial_authorizations WHERE sale_id=? AND invoice_id=? AND status='AUTHORIZED' ORDER BY id DESC LIMIT 1 FOR UPDATE",[saleId,String(invoice.id)]);
  const authorization=authorizations[0];
  if(!authorization)return assertActiveInvoiceFinancialClearance(invoice,gate);
  if(balance>Number(authorization.balance_due_snapshot)+.001)throw new HttpError(409,'Autorisation financière insuffisante — une nouvelle autorisation est requise.');
  return{invoice,authorization,financiallyCleared:false,coveredByAuthorization:true} satisfies DeliveryFinancialEligibility;
}

export async function useDeliveryFinancialAuthorization(connection:PoolConnection,saleId:string,deliveryId:string,userId:string){
  const eligibility=await lockActiveSaleInvoice(connection,saleId,'delivery') as DeliveryFinancialEligibility;
  if(eligibility.coveredByAuthorization&&eligibility.authorization){
    await connection.execute("UPDATE delivery_financial_authorizations SET status='USED',used_by=?,used_at=NOW(),used_delivery_id=? WHERE id=? AND status='AUTHORIZED'",[userId,deliveryId,eligibility.authorization.id]);
  }
  return eligibility;
}
