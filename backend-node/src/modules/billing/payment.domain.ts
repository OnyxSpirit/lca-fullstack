import{HttpError}from'../../shared/http-error.js';

export interface PaymentBalance{paid:number;balance:number;status:'partially_paid'|'paid'}
export function applyPayment(currentPaid:number,currentBalance:number,amount:number):PaymentBalance{
  if(!Number.isFinite(amount)||amount<=0)throw new HttpError(400,'Montant invalide');
  if(amount>currentBalance+.001)throw new HttpError(409,`Le montant saisi dépasse le solde restant de ${Math.round((amount-currentBalance)*100)/100} XAF`);
  const balance=Math.max(0,Math.round((currentBalance-amount)*100)/100);
  return{paid:Math.round((currentPaid+amount)*100)/100,balance,status:balance<=.001?'paid':'partially_paid'};
}
export function assertFinanciallySettled(balance:unknown,subject:'vente'|'livraison'|'atelier'){
  const remaining=Number(balance);
  if(!Number.isFinite(remaining)||remaining<0)throw new HttpError(409,'Solde financier invalide');
  const action=subject==='vente'?'La vente ne peut pas être finalisée':subject==='atelier'?'Le véhicule ne peut pas être remis':'La livraison est impossible';
  if(remaining>.001)throw new HttpError(409,`${action} tant que le solde restant de ${remaining.toLocaleString('fr-FR')} XAF n’est pas nul.`);
}
