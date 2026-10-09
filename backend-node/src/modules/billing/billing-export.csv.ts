import{financialCsv,type CsvValue}from'../reports/report.csv.js';

type Row=Record<string,unknown>;
export type BillingExportData={invoices:Row[];payments:Row[];legacyRefunds:Row[];refunds:Row[];credits:Row[];currencyCode:string};

const labels:Record<string,string>={
  draft:'Brouillon',issued:'Émise',partially_paid:'Partiellement réglée',paid:'Réglée',overdue:'Échue',cancelled:'Annulée',
  confirmed:'Confirmé',refunded:'Remboursé',partially_refunded:'Partiellement remboursé',failed:'Refusé',rejected:'Refusé',pending:'En attente',
  applied:'Appliqué'
};
const label=(value:unknown)=>labels[String(value??'')]??String(value??'');
const amount=(value:unknown)=>Number(value??0);

export function billingOperationsCsv(data:BillingExportData){
  const currency=data.currencyCode,rows:CsvValue[][]=[['Type d’opération','Pièce','Date','Tiers ou pièce liée',`Montant facturé ${currency}`,`Montant encaissé ${currency}`,`Montant remboursé ${currency}`,`Montant avoir ${currency}`,`TVA ${currency}`,'Moyen de paiement','Statut']];
  for(const x of data.invoices)rows.push(['Facture',String(x.invoice_number??''),String(x.issue_date??''),String(x.customer_name??''),amount(x.total),0,0,0,amount(x.tax_total),'',label(x.effective_status??x.status)]);
  for(const x of data.payments)rows.push(['Paiement',String(x.payment_number??''),String(x.payment_date??''),String(x.invoice_number??''),0,amount(x.amount),0,0,0,String(x.payment_method??''),'Confirmé']);
  for(const x of data.legacyRefunds)rows.push(['Remboursement historique',`REM-${String(x.payment_number??'')}`,String(x.refunded_at??''),String(x.invoice_number??''),0,0,amount(x.amount),0,0,String(x.payment_method??''),'Remboursé']);
  for(const x of data.refunds)rows.push(['Remboursement',String(x.refund_number??''),String(x.refunded_at??''),String(x.invoice_number??''),0,0,amount(x.amount),0,0,String(x.payment_method??''),Number(x.is_reversed)?'Contrepassé':'Remboursé']);
  for(const x of data.credits)rows.push(['Avoir',String(x.credit_note_number??''),String(x.issue_date??''),String(x.invoice_number??''),0,0,0,amount(x.amount),0,'',label(x.status)]);
  return financialCsv(rows);
}
