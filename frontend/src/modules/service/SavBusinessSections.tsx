import React,{useState}from'react';
import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';
import{useNavigate}from'react-router-dom';
import{Card}from'../../components/ui/Card';
import{Button}from'../../components/ui/Button';
import{TableEmptyState}from'../../components/common/TableEmptyState';
import{formatCurrency,formatDate,formatDateTime}from'../../lib/utils';
import{apiRequest}from'../../services/apiClient';
import{useAuthStore}from'../../stores/authStore';
import{useInvoicesPageQuery}from'../../api/erpHooks';
import{InvoicePaymentForm}from'../billing/InvoicePaymentComponents';
import{generateUuid}from'../../lib/uuid';
import{promptAction}from'../../components/ui/BusinessDialog';

const field='rounded-lg border border-slate-300 bg-white p-2 text-xs';
const sessionEnabled=()=>Boolean(localStorage.getItem('lca-access-token'));
const ErrorBox=({error}:{error:unknown})=><p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error instanceof Error?error.message:'Erreur API'}</p>;

export const SavBillingSection=()=>{
 const can=useAuthStore(s=>s.can),navigate=useNavigate(),[search,setSearch]=useState(''),[status,setStatus]=useState('');
 const query=useInvoicesPageQuery({type:'workshop',search,status,page:1,pageSize:250},can('service.billing.view')),invoices=query.data?.items??[];
 return <div className="space-y-4">
  <div className="flex flex-wrap gap-2"><input className={`${field} min-w-64 flex-1`} placeholder="Facture, OR ou client" value={search} onChange={e=>setSearch(e.target.value)}/><select className={field} value={status} onChange={e=>setStatus(e.target.value)}><option value="">Tous les états</option><option value="issued">À régler</option><option value="partially_paid">Partiellement réglée</option><option value="paid">Réglée</option><option value="overdue">Échue</option></select></div>
  {query.isError&&<ErrorBox error={query.error}/>}<Card padding="none"><div className="overflow-x-auto"><table className="w-full min-w-[920px] text-xs"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Facture</th><th>OR</th><th>Client</th><th>Total</th><th>Encaissé</th><th>Solde</th><th>État</th><th>Actions</th></tr></thead><tbody>
   {query.isLoading&&<TableEmptyState colSpan={8} message="Chargement des factures SAV…" isLoading/>}{!query.isLoading&&!invoices.length&&<TableEmptyState colSpan={8} message="Aucune facture SAV"/>}
   {invoices.map(invoice=><tr className="border-t" key={invoice.id}><td className="p-3 font-mono font-semibold">{invoice.invoiceNumber}<small className="block text-slate-500">{formatDate(invoice.issueDate)}</small></td><td><button className="text-blue-700 hover:underline" onClick={()=>invoice.repairOrderId&&navigate(`/service/repair-orders/${invoice.repairOrderId}`)}>{invoice.relatedDocNumber}</button></td><td>{invoice.customerName}</td><td>{formatCurrency(invoice.amountTTC,invoice.currencyCode)}</td><td>{formatCurrency(invoice.paidAmountTTC,invoice.currencyCode)}</td><td className="font-semibold">{formatCurrency(invoice.remainingAmountTTC,invoice.currencyCode)}</td><td>{invoice.status}</td><td><div className="flex gap-2"><Button size="xs" variant="outline" onClick={()=>navigate(`/billing/${invoice.id}`)}>Document</Button><InvoicePaymentForm invoice={invoice} canCollect={can('service.billing.collect')&&can('billing.payment.collect')}/></div></td></tr>)}
  </tbody></table></div></Card>
 </div>;
};

type Balance={agencyId:string;fundNature:string;total:number;available:number;engaged:number;transferred:number;pendingConfirmation:number};
type Transit={balances:Balance[];transfers:any[]};
export const SavTransitSection=()=>{
 const can=useAuthStore(s=>s.can),agency=useAuthStore(s=>s.currentAgency),qc=useQueryClient();
 const query=useQuery({queryKey:['sav','transit'],queryFn:()=>apiRequest<Transit>('/sav/transit'),enabled:sessionEnabled()&&can('service.transit.view')});
 const[form,setForm]=useState({fundNature:'CASH',amount:'',reference:'',notes:''}),refresh=()=>void qc.invalidateQueries({queryKey:['sav','transit']});
 const create=useMutation({mutationFn:()=>apiRequest('/sav/transit',{method:'POST',body:JSON.stringify({agencyId:agency?.id,...form,amount:Number(form.amount),idempotencyKey:generateUuid()})}),onSuccess:refresh});
 const decision=useMutation({mutationFn:({id,status,reason}:{id:string;status:string;reason?:string})=>apiRequest(`/sav/transit/${id}/decision`,{method:'POST',body:JSON.stringify({decision:status,reason})}),onSuccess:refresh});
 const refuse=async(id:string)=>{const reason=await promptAction('Motif du refus');if(reason?.trim())decision.mutate({id,status:'REFUSE',reason})};
 return <div className="space-y-4">
  {query.isError&&<ErrorBox error={query.error}/>}<div className="grid gap-3 md:grid-cols-3">{(query.data?.balances??[]).map(item=><Card key={`${item.agencyId}-${item.fundNature}`}><p className="text-xs font-semibold text-slate-500">{item.fundNature==='CASH'?'Espèces détenues':item.fundNature==='ELECTRONIC'?'Paiements électroniques':'Compte central'}</p><p className="mt-1 text-xl font-bold">{formatCurrency(item.available)}</p><p className="mt-2 text-xs text-slate-500">Total {formatCurrency(item.total)} · Engagé {formatCurrency(item.engaged)} · Transféré {formatCurrency(item.transferred)}</p></Card>)}</div>
  {can('service.transit.initiate')&&<Card><form className="flex flex-wrap items-end gap-2" onSubmit={e=>{e.preventDefault();create.mutate()}}><label className="text-xs font-semibold">Nature<select className={`mt-1 block ${field}`} value={form.fundNature} onChange={e=>setForm({...form,fundNature:e.target.value})}><option value="CASH">Espèces</option><option value="ELECTRONIC">Électronique</option><option value="CENTRAL_ACCOUNT">Compte central</option></select></label><label className="text-xs font-semibold">Montant<input required min="0.01" step="0.01" type="number" className={`mt-1 block ${field}`} value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label className="text-xs font-semibold">Référence<input className={`mt-1 block ${field}`} value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></label><label className="min-w-52 flex-1 text-xs font-semibold">Notes<input className={`mt-1 block w-full ${field}`} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label><Button type="submit" loading={create.isPending}>Initier</Button></form>{create.isError&&<ErrorBox error={create.error}/>}</Card>}
  <Card padding="none"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Transfert</th><th>Nature</th><th>Montant</th><th>Initiation</th><th>Statut</th><th>Décision</th></tr></thead><tbody>{query.isLoading&&<TableEmptyState colSpan={6} message="Chargement de la caisse…" isLoading/>}{!query.isLoading&&!query.data?.transfers.length&&<TableEmptyState colSpan={6} message="Aucun transfert"/>}{query.data?.transfers.map(item=><tr className="border-t" key={item.id}><td className="p-3 font-mono">{item.transfer_number}<small className="block text-slate-500">{item.reference||'—'}</small></td><td>{item.fund_nature}</td><td>{formatCurrency(item.amount,item.currency_code)}</td><td>{formatDateTime(item.initiated_at)}</td><td>{item.status}</td><td>{item.status==='EN_ATTENTE_RECEPTION'&&<div className="flex gap-1">{can('service.transit.confirm')&&<Button size="xs" onClick={()=>decision.mutate({id:item.id,status:'CONFIRME'})}>Confirmer réception</Button>}{can('service.transit.resolve')&&<Button size="xs" variant="danger" onClick={()=>void refuse(item.id)}>Refuser</Button>}</div>}</td></tr>)}</tbody></table></div></Card>
 </div>;
};

export const SavJournalSection=()=>{
 const can=useAuthStore(s=>s.can),navigate=useNavigate(),[search,setSearch]=useState('');
 const query=useQuery({queryKey:['sav','journal',search],queryFn:()=>apiRequest<any[]>(`/sav/journal?search=${encodeURIComponent(search)}`),enabled:sessionEnabled()&&can('service.journal.view')});
 return <div className="space-y-3"><input className={`${field} w-full`} placeholder="Rechercher un OR, une facture ou un client" value={search} onChange={e=>setSearch(e.target.value)}/>{query.isError&&<ErrorBox error={query.error}/>}<Card padding="none"><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Date</th><th>Opération</th><th>Référence</th><th>Client</th><th>Montant</th><th>Utilisateur</th><th>Motif</th></tr></thead><tbody>{query.isLoading&&<TableEmptyState colSpan={7} message="Chargement du journal…" isLoading/>}{!query.isLoading&&!query.data?.length&&<TableEmptyState colSpan={7} message="Aucune opération SAV"/>}{query.data?.map((item,index)=><tr className="border-t" key={`${item.event_type}-${index}`}><td className="p-3">{formatDateTime(item.occurred_at)}</td><td className="font-semibold">{item.event_type}</td><td><button className="text-blue-700 hover:underline" onClick={()=>item.repair_order_id&&navigate(`/service/repair-orders/${item.repair_order_id}`)}>{item.reference}</button></td><td>{item.customer_name||'—'}</td><td>{item.amount==null?'—':formatCurrency(item.amount)}</td><td>{item.user_name||'Système'}</td><td>{item.reason||'—'}</td></tr>)}</tbody></table></div></Card></div>;
};

export const SavReportingSection=()=>{
 const can=useAuthStore(s=>s.can),today=new Date().toISOString().slice(0,10),[from,setFrom]=useState(`${today.slice(0,8)}01`),[to,setTo]=useState(today);
 const query=useQuery({queryKey:['sav','reporting',from,to],queryFn:()=>apiRequest<any>(`/sav/reporting?from=${from}&to=${to}`),enabled:sessionEnabled()&&can('service.reporting.view')}),data=query.data;
 const metrics=data?[['OR',data.activity.repair_orders],['OR ouverts',data.activity.open_orders],['OR clôturés',data.activity.closed_orders],['Devis émis',data.commercial.quotes_issued],['Taux acceptation',`${data.commercial.acceptance_rate}%`],['Facturé',formatCurrency(Number(data.billing.billed))],['Encaissé',formatCurrency(Number(data.billing.collected))],['Créances',formatCurrency(Number(data.billing.receivables))]]:[];
 return <div className="space-y-4"><div className="flex gap-2"><input type="date" className={field} value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" className={field} value={to} onChange={e=>setTo(e.target.value)}/></div>{query.isError&&<ErrorBox error={query.error}/>}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{metrics.map(([label,value])=><Card key={String(label)}><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-bold">{value}</p></Card>)}</div><div className="grid gap-4 lg:grid-cols-2"><Card><h3 className="mb-3 font-semibold">Encaissements par moyen</h3>{data?.paymentMethods?.map((item:any)=><div key={item.method} className="flex justify-between border-t py-2 text-sm"><span>{item.method}</span><b>{formatCurrency(item.amount)}</b></div>)}</Card><Card><h3 className="mb-3 font-semibold">Caisse de transit</h3>{data?.transit?.map((item:any)=><div key={`${item.agencyId}-${item.fundNature}`} className="flex justify-between border-t py-2 text-sm"><span>{item.fundNature}</span><b>{formatCurrency(item.available)} disponible</b></div>)}</Card></div></div>;
};
