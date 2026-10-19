import{useState}from'react';import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';import{Button}from'../../components/ui/Button';import{Card}from'../../components/ui/Card';import{Modal}from'../../components/ui/Modal';import{apiRequest}from'../../services/apiClient';import{useAuthStore}from'../../stores/authStore';import{ProviderFinanceAdministration}from'./ProviderFinanceAdministration';
type R={id:string;contract_reference:string;service_subject:string;provider_code:string;first_name:string|null;last_name:string|null;company_name:string|null;agency_name:string;source_kind:'PERIOD'|'FIXED'|'INSTALLMENT';period_start:string|null;period_end:string|null;gross_amount:number;withholding_amount:number;net_amount:number;status:'DRAFT'|'SUBMITTED'|'VALIDATED'|'REJECTED'|'CANCELLED';prepared_at:string};type C={id:string;reference:string;service_subject:string;compensation_mode:'PERIODIC'|'FIXED'|'INSTALLMENTS';contractual_amount:number;start_date:string;contractual_end_date:string|null;agency_name:string;provider_code:string;first_name:string|null;last_name:string|null;company_name:string|null;installments:Array<{id:number;order:number;dueDate:string;amount:number;usedAt:string|null}>|string|null};
const input='w-full rounded-md border border-slate-300 px-3 py-2 text-xs',money=(x:number)=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XAF'}).format(x),labels:Record<string,string>={DRAFT:'Préparation',SUBMITTED:'Soumise',VALIDATED:'En attente de traitement financier',REJECTED:'Rejetée',CANCELLED:'Annulée',PERIOD:'Période',FIXED:'Forfait',INSTALLMENT:'Échéance'};
export function ProviderRemunerationsAdministration(){const can=useAuthStore(s=>s.can),qc=useQueryClient(),[status,setStatus]=useState(''),[open,setOpen]=useState(false),[contractId,setContractId]=useState(''),[error,setError]=useState(''),[reasonDialog,setReasonDialog]=useState<{id:string;action:'reject'|'cancel'}>();const rows=useQuery({queryKey:['hr','provider-remunerations',status],queryFn:()=>apiRequest<R[]>(`/hr/provider-remunerations${status?`?status=${status}`:''}`),enabled:can('hr.provider.remuneration.view')}),contracts=useQuery({queryKey:['hr','provider-remuneration-contracts'],queryFn:()=>apiRequest<C[]>('/hr/provider-remunerations/contracts'),enabled:can('hr.provider.remuneration.prepare')}),selected=contracts.data?.find(x=>x.id===contractId),parts=selected?(typeof selected.installments==='string'?JSON.parse(selected.installments):selected.installments)??[]:[];const mutation=useMutation({mutationFn:({path,body}:{path:string;body?:unknown})=>apiRequest(path,{method:'POST',body:JSON.stringify(body??{})}),onSuccess:()=>qc.invalidateQueries({queryKey:['hr','provider-remunerations']})});const run=async(path:string,body?:unknown)=>{setError('');try{await mutation.mutateAsync({path,body});setOpen(false);setReasonDialog(undefined)}catch(e){setError(e instanceof Error?e.message:'Opération impossible')}};if(!can('hr.provider.remuneration.view'))return null;return <div className="space-y-4">
<Card>
<div className="flex flex-wrap items-end justify-between gap-3">
<div>
<h2 className="font-bold">Rémunérations des prestataires</h2>
<p className="text-xs text-slate-500">Constatations contractuelles XAF distinctes de la paie salariée. Aucun paiement ni engagement financier au LOT 5.</p>
</div>
<div className="flex gap-2">
<select className={input} value={status} onChange={e=>setStatus(e.target.value)}>
<option value="">Tous les statuts</option>{Object.entries(labels).slice(0,5).map(([v,l])=>
<option key={v} value={v}>{l}</option>)}</select>{can('hr.provider.remuneration.prepare')&&<Button onClick={()=>setOpen(true)}>Nouvelle constatation</Button>}</div>
</div>
</Card>{rows.isLoading&&<Card>Chargement…</Card>}{rows.isError&&<Card className="text-red-700">Chargement impossible.</Card>}{rows.data?.map(x=>
<Card key={x.id}>
<div className="flex justify-between gap-3">
<div>
<b>{x.company_name??`${x.first_name??''} ${x.last_name??''}`.trim()} · {x.contract_reference}</b>
<p className="text-xs text-slate-500">{x.agency_name} · {x.service_subject} · {labels[x.source_kind]} · {x.period_start??'—'}{x.period_end&&x.period_end!==x.period_start?` au ${x.period_end}`:''}</p>
<p className="text-xs">{labels[x.status]} · constatée le {new Date(x.prepared_at).toLocaleDateString('fr-FR')}</p>
</div>
<div className="text-right text-xs">
<b>{money(x.net_amount)}</b>
<p>Brut {money(x.gross_amount)} · retenue {money(x.withholding_amount)}</p>
</div>
</div>
<div className="mt-3 flex justify-end gap-2">{(x.status==='DRAFT'||x.status==='REJECTED')&&can('hr.provider.remuneration.submit')&&<Button size="xs" onClick={()=>void run(`/hr/provider-remunerations/${x.id}/submit`)}>Soumettre</Button>}{x.status==='SUBMITTED'&&can('hr.provider.remuneration.validate')&&<>
<Button size="xs" onClick={()=>void run(`/hr/provider-remunerations/${x.id}/validate`)}>Valider la constatation</Button>
<Button size="xs" variant="outline" onClick={()=>setReasonDialog({id:x.id,action:'reject'})}>Rejeter</Button>
</>}{(x.status==='DRAFT'||x.status==='REJECTED')&&can('hr.provider.remuneration.prepare')&&<Button size="xs" variant="outline" onClick={()=>setReasonDialog({id:x.id,action:'cancel'})}>Annuler</Button>}</div>
</Card>)}{rows.isSuccess&&!rows.data?.length&&<Card>Aucune rémunération prestataire.</Card>}{error&&<p role="alert" className="rounded bg-red-50 p-3 text-xs text-red-700">{error}</p>}
<Modal isOpen={open} onClose={()=>setOpen(false)} title="Constater une rémunération prestataire">
<form className="grid gap-3" onSubmit={e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.currentTarget).entries());void run('/hr/provider-remunerations',{...b,contractId})}}>
<select required className={input} value={contractId} onChange={e=>setContractId(e.target.value)}>
<option value="">Contrat actif éligible…</option>{contracts.data?.map(c=>
<option key={c.id} value={c.id}>{c.provider_code} · {c.reference} · {c.agency_name}</option>)}</select>{selected?.compensation_mode==='PERIODIC'&&<>
<input required name="periodStart" type="date" className={input}/>
<input required name="periodEnd" type="date" className={input}/>
<p className="text-xs text-amber-700">Seules les périodes mensuelles complètes sont autorisées sans règle de prorata validée.</p>
</>}{selected?.compensation_mode==='FIXED'&&<>
<input required name="grossAmount" type="number" step="0.01" min="0.01" defaultValue={selected.contractual_amount} className={input}/>
<p className="text-xs">La saisie confirme explicitement l’exigibilité du forfait complet.</p>
</>}{selected?.compensation_mode==='INSTALLMENTS'&&<select required name="installmentId" className={input}>
<option value="">Échéance non utilisée…</option>{parts.filter((p:any)=>!p.usedAt).map((p:any)=>
<option key={p.id} value={p.id}>{p.order} · {String(p.dueDate).slice(0,10)} · {money(Number(p.amount))}</option>)}</select>}<input name="withholdingAmount" type="number" step="0.01" min="0" defaultValue="0" className={input} placeholder="Retenue explicite XAF"/>
<textarea name="withholdingReason" className={input} placeholder="Justification obligatoire si retenue"/>{error&&<p className="text-xs text-red-700">{error}</p>}<div className="flex justify-end gap-2">
<Button type="button" variant="outline" onClick={()=>setOpen(false)}>Annuler</Button>
<Button type="submit" loading={mutation.isPending}>Créer la préparation</Button>
</div>
</form>
</Modal>
<ProviderFinanceAdministration/>
<Modal isOpen={Boolean(reasonDialog)} onClose={()=>setReasonDialog(undefined)} title={reasonDialog?.action==='reject'?'Rejeter la constatation':'Annuler la constatation'}>
<form onSubmit={e=>{e.preventDefault();const reason=String(new FormData(e.currentTarget).get('reason')??'');if(reasonDialog)void run(`/hr/provider-remunerations/${reasonDialog.id}/${reasonDialog.action}`,{reason})}} className="grid gap-3">
<textarea required minLength={3} name="reason" className={input}/>
<Button type="submit">Confirmer</Button>
</form>
</Modal>
</div>}
