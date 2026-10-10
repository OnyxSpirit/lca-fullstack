import React,{useState}from'react';
import{useInvoicePayment,usePaymentMethodsQuery}from'../../api/erpHooks';
import{Button}from'../../components/ui/Button';
import{Modal}from'../../components/ui/Modal';
import{formatCurrency,formatDateTime}from'../../lib/utils';
import{generateUuid}from'../../lib/uuid';
import{apiDownload}from'../../services/apiClient';
import{useUiStore}from'../../stores/uiStore';
import type{InvoicePayment}from'../../types';
import{canCollectInvoicePayment}from'./invoicePaymentPolicy';

type PaymentTarget={id:string;status:string;remainingAmountTTC:number};

export const InvoicePaymentForm:React.FC<{invoice:PaymentTarget;canCollect:boolean}>=({invoice,canCollect})=>{
 const[open,setOpen]=useState(false),[operationKey,setOperationKey]=useState(generateUuid()),[form,setForm]=useState({amount:invoice.remainingAmountTTC,paymentMethodId:'',reference:'',notes:''});
 const methodsQuery=usePaymentMethodsQuery(canCollect),methods=methodsQuery.data??[],payment=useInvoicePayment(),toast=useUiStore(s=>s.addToast),selected=methods.find((item:any)=>String(item.id)===form.paymentMethodId),allowed=canCollectInvoicePayment(invoice.status,invoice.remainingAmountTTC,canCollect);
 const submit=async(event:React.FormEvent)=>{event.preventDefault();if(payment.isPending)return;try{await payment.mutateAsync({invoiceId:invoice.id,paymentMethodId:form.paymentMethodId,amount:form.amount,reference:form.reference,notes:form.notes,idempotencyKey:operationKey});toast({type:'success',title:'Paiement enregistré'});setOperationKey(generateUuid());setOpen(false)}catch(error){toast({type:'error',title:'Encaissement impossible',description:error instanceof Error?error.message:'Erreur API'})}};
 if(!allowed)return null;
 return <><Button size="sm" onClick={()=>{setForm({amount:invoice.remainingAmountTTC,paymentMethodId:String(methods[0]?.id??''),reference:'',notes:''});setOpen(true)}} disabled={payment.isPending}>Encaisser</Button><Modal isOpen={open} onClose={()=>!payment.isPending&&setOpen(false)} title="Enregistrer un règlement"><form onSubmit={submit} className="space-y-3"><label className="text-xs font-semibold">Montant<input required type="number" min="0.01" max={invoice.remainingAmountTTC} step="0.01" className="mt-1 w-full rounded border p-2" value={form.amount} onChange={event=>setForm({...form,amount:Number(event.target.value)})}/></label><label className="text-xs font-semibold">Moyen de paiement<select required className="mt-1 w-full rounded border p-2" value={form.paymentMethodId} onChange={event=>setForm({...form,paymentMethodId:event.target.value,reference:''})}><option value="">Sélectionner</option>{methods.map((item:any)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{selected?.requires_reference&&<label className="text-xs font-semibold">Référence transaction<input required className="mt-1 w-full rounded border p-2" value={form.reference} onChange={event=>setForm({...form,reference:event.target.value})}/></label>}<label className="text-xs font-semibold">Notes<textarea className="mt-1 w-full rounded border p-2" value={form.notes} onChange={event=>setForm({...form,notes:event.target.value})}/></label><div className="flex justify-end"><Button type="submit" loading={payment.isPending} disabled={payment.isPending}>Valider</Button></div></form></Modal></>;
};

export const InvoicePaymentHistory:React.FC<{payments?:InvoicePayment[];canRefund?:boolean;onRefund?:(payment:InvoicePayment)=>void}>=({payments=[],canRefund=false,onRefund})=>{
 const toast=useUiStore(s=>s.addToast),download=async(payment:InvoicePayment)=>{try{const blob=await apiDownload(`/payments/${payment.id}/receipt`),url=URL.createObjectURL(blob),anchor=document.createElement('a');anchor.href=url;anchor.download=`recu-${payment.paymentNumber}.pdf`;anchor.click();URL.revokeObjectURL(url)}catch(error){toast({type:'error',title:'Reçu indisponible',description:error instanceof Error?error.message:'Erreur API'})}};
 return payments.length?<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-xs"><thead><tr className="text-left"><th>Règlement</th><th>Date</th><th>Méthode</th><th>Référence</th><th>Opérateur</th><th>Montant</th><th>Remboursé</th><th>Statut</th><th></th></tr></thead><tbody>{payments.map(item=><tr key={item.id} className="border-t"><td className="py-2 font-mono">{item.paymentNumber}</td><td>{formatDateTime(item.paymentDate)}</td><td>{item.paymentMethod}</td><td>{item.reference||'—'}</td><td>{item.receivedByName||'—'}</td><td>{formatCurrency(item.amount)}</td><td>{formatCurrency(item.refundedAmount)}</td><td>{item.status}</td><td><Button size="xs" variant="outline" onClick={()=>void download(item)}>Reçu</Button>{canRefund&&item.refundableRemaining>0&&onRefund&&<Button size="xs" variant="outline" onClick={()=>onRefund(item)}>Rembourser</Button>}</td></tr>)}</tbody></table></div>:<p className="text-sm text-slate-500">Aucun règlement.</p>;
};
