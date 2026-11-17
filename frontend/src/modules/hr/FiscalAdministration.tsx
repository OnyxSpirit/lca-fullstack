import {useMutation,useQuery,useQueryClient} from '@tanstack/react-query';
import {useState} from 'react';
import {apiRequest} from '../../services/apiClient';
import {useAuthStore} from '../../stores/authStore';
import {useUiStore} from '../../stores/uiStore';
import {Badge} from '../../components/ui/Badge';
import {Button} from '../../components/ui/Button';
import {Card} from '../../components/ui/Card';
import {Modal} from '../../components/ui/Modal';
import {promptAction} from '../../components/ui/BusinessDialog';

type TaxType={id:string;code:string;label:string;is_active:boolean};
type Obligation={id:string;reference:string;tax_label:string;period_start:string;period_end:string;due_date:string;declared_amount:number|null;paid_amount:number;currency_code:string;status:string};
const field='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs';
const today=()=>new Date().toISOString().slice(0,10);
const money=(value:number|null,currency='XAF')=>value==null?'—':`${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(value)} ${currency}`;

export default function FiscalAdministration(){
 const can=useAuthStore(s=>s.can),toast=useUiStore(s=>s.addToast),qc=useQueryClient();
 const[open,setOpen]=useState(false),[typeOpen,setTypeOpen]=useState(false);
 const[typeForm,setTypeForm]=useState({code:'',label:'',authorityName:'',filingFrequency:'OTHER'});
 const[form,setForm]=useState({taxTypeId:'',reference:'',periodStart:`${new Date().getFullYear()}-01-01`,periodEnd:today(),dueDate:today(),taxableBase:'',declaredAmount:'',currencyCode:'XAF'});
 const types=useQuery({queryKey:['fiscal','types'],queryFn:()=>apiRequest<TaxType[]>('/fiscal/tax-types'),enabled:can('fiscal.obligation.view')});
 const obligations=useQuery({queryKey:['fiscal','obligations'],queryFn:()=>apiRequest<Obligation[]>('/fiscal/obligations'),enabled:can('fiscal.obligation.view')});
 const mutation=useMutation({mutationFn:({path,body}:{path:string;body?:unknown})=>apiRequest(path,{method:'POST',body:JSON.stringify(body??{})}),onSuccess:async()=>qc.invalidateQueries({queryKey:['fiscal']})});
 const run=async(path:string,body:unknown,title:string)=>{try{await mutation.mutateAsync({path,body});toast({type:'success',title});return true}catch(error){toast({type:'error',title:'Action impossible',description:error instanceof Error?error.message:'Erreur API'});return false}};
 const createType=async()=>{if(await run('/fiscal/tax-types',typeForm,'Nature fiscale créée'))setTypeOpen(false)};
 const create=async()=>{if(await run('/fiscal/obligations',{...form,taxableBase:form.taxableBase||null,declaredAmount:form.declaredAmount||null},'Obligation créée'))setOpen(false)};
 const pay=async(id:string)=>{const raw=await promptAction('Montant du règlement',{inputType:'number'});if(raw===null)return;const amount=Number(raw);if(!Number.isFinite(amount)||amount<=0){toast({type:'error',title:'Montant invalide',description:'Le montant du règlement doit être strictement positif.'});return}await run(`/fiscal/obligations/${id}/payments`,{amount,reference:`REG-${Date.now()}`},'Règlement enregistré')};
 return <div className="space-y-4">
  <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">Fiscalité d’entreprise</h3><p className="text-xs text-slate-500">Échéances, déclarations et règlements avec règles historisées. Les taux doivent être documentés et vérifiés avant application.</p></div><div className="flex gap-2">{can('fiscal.catalog.manage')&&<Button variant="outline" disabled={mutation.isPending} onClick={()=>setTypeOpen(true)}>Configurer une nature</Button>}{can('fiscal.obligation.manage')&&<Button disabled={mutation.isPending} onClick={()=>setOpen(true)}>Nouvelle obligation</Button>}</div></div>
  <Card><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-xs"><thead><tr className="text-left"><th>Référence</th><th>Nature</th><th>Période</th><th>Échéance</th><th>Déclaré</th><th>Réglé</th><th>Statut</th><th>Actions</th></tr></thead><tbody>
   {obligations.data?.map(item=><tr key={item.id} className="border-t"><td className="py-3 font-bold">{item.reference}</td><td>{item.tax_label}</td><td>{item.period_start.slice(0,10)} – {item.period_end.slice(0,10)}</td><td>{item.due_date.slice(0,10)}</td><td>{money(item.declared_amount,item.currency_code)}</td><td>{money(item.paid_amount,item.currency_code)}</td><td><Badge>{item.status}</Badge></td><td><div className="flex gap-1">
    {['DRAFT','REJECTED'].includes(item.status)&&can('fiscal.obligation.submit')&&<Button size="xs" loading={mutation.isPending} disabled={mutation.isPending} onClick={()=>void run(`/fiscal/obligations/${item.id}/submit`,{},'Obligation soumise')}>Soumettre</Button>}
    {item.status==='SUBMITTED'&&can('fiscal.obligation.approve')&&<><Button size="xs" loading={mutation.isPending} disabled={mutation.isPending} onClick={()=>void run(`/fiscal/obligations/${item.id}/approve`,{},'Obligation validée')}>Valider</Button><Button size="xs" variant="outline" disabled={mutation.isPending} onClick={async()=>{const reason=await promptAction('Motif du rejet');if(reason?.trim())await run(`/fiscal/obligations/${item.id}/reject`,{reason:reason.trim()},'Obligation rejetée')}}>Rejeter</Button></>}
    {['VALIDATED','PARTIALLY_PAID'].includes(item.status)&&can('fiscal.obligation.pay')&&<Button size="xs" variant="outline" loading={mutation.isPending} disabled={mutation.isPending} onClick={()=>void pay(item.id)}>Régler</Button>}
   </div></td></tr>)}
   {obligations.isSuccess&&!obligations.data?.length&&<tr><td colSpan={8} className="py-8 text-center text-slate-500">Aucune obligation fiscale enregistrée.</td></tr>}
  </tbody></table></div></Card>
  <Modal isOpen={typeOpen} onClose={()=>{if(!mutation.isPending)setTypeOpen(false)}} title="Configurer une nature fiscale"><div className="space-y-3">
   <input aria-label="Code de la nature fiscale" className={field} placeholder="Code unique" value={typeForm.code} onChange={e=>setTypeForm({...typeForm,code:e.target.value.toUpperCase()})}/>
   <input aria-label="Libellé de la nature fiscale" className={field} placeholder="Libellé" value={typeForm.label} onChange={e=>setTypeForm({...typeForm,label:e.target.value})}/>
   <input aria-label="Administration fiscale" className={field} placeholder="Administration ou autorité compétente" value={typeForm.authorityName} onChange={e=>setTypeForm({...typeForm,authorityName:e.target.value})}/>
   <select aria-label="Fréquence de déclaration" className={field} value={typeForm.filingFrequency} onChange={e=>setTypeForm({...typeForm,filingFrequency:e.target.value})}><option value="MONTHLY">Mensuelle</option><option value="QUARTERLY">Trimestrielle</option><option value="ANNUAL">Annuelle</option><option value="OTHER">Autre</option></select>
   <div className="flex justify-end gap-2"><Button variant="outline" disabled={mutation.isPending} onClick={()=>setTypeOpen(false)}>Annuler</Button><Button loading={mutation.isPending} disabled={mutation.isPending||!typeForm.code.trim()||!typeForm.label.trim()||!typeForm.authorityName.trim()} onClick={()=>void createType()}>Enregistrer</Button></div>
  </div></Modal>
  <Modal isOpen={open} onClose={()=>{if(!mutation.isPending)setOpen(false)}} title="Nouvelle obligation fiscale"><div className="space-y-3">
   <select aria-label="Nature fiscale" className={field} value={form.taxTypeId} onChange={e=>setForm({...form,taxTypeId:e.target.value})}><option value="">Choisir une nature configurée</option>{types.data?.filter(x=>x.is_active).map(x=><option key={x.id} value={x.id}>{x.label} ({x.code})</option>)}</select>
   <input aria-label="Référence fiscale" className={field} placeholder="Référence interne" value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/>
   <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><input aria-label="Début période fiscale" type="date" className={field} value={form.periodStart} onChange={e=>setForm({...form,periodStart:e.target.value})}/><input aria-label="Fin période fiscale" type="date" className={field} value={form.periodEnd} onChange={e=>setForm({...form,periodEnd:e.target.value})}/><input aria-label="Échéance fiscale" type="date" className={field} value={form.dueDate} onChange={e=>setForm({...form,dueDate:e.target.value})}/></div>
   <div className="grid grid-cols-1 gap-2 sm:grid-cols-2"><input aria-label="Base imposable" type="number" min="0" className={field} placeholder="Base imposable" value={form.taxableBase} onChange={e=>setForm({...form,taxableBase:e.target.value})}/><input aria-label="Montant déclaré" type="number" min="0" className={field} placeholder="Montant déclaré" value={form.declaredAmount} onChange={e=>setForm({...form,declaredAmount:e.target.value})}/></div>
   <div className="flex justify-end gap-2"><Button variant="outline" disabled={mutation.isPending} onClick={()=>setOpen(false)}>Annuler</Button><Button loading={mutation.isPending} disabled={mutation.isPending||!form.taxTypeId||!form.reference.trim()||!form.periodStart||!form.periodEnd||!form.dueDate} onClick={()=>void create()}>Enregistrer</Button></div>
  </div></Modal>
 </div>
}
