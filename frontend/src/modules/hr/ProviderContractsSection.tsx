import{useState}from'react';
import{useMutation,useQuery,useQueryClient}from'@tanstack/react-query';
import{apiRequest,apiDownload}from'../../services/apiClient';
import{useAuthStore}from'../../stores/authStore';
import{useUiStore}from'../../stores/uiStore';
import{useDocumentReferences,useEntityDocuments}from'../../api/documentHooks';
import{Badge}from'../../components/ui/Badge';
import{Button}from'../../components/ui/Button';
import{Modal}from'../../components/ui/Modal';
import{UploadModal}from'../documents/DocumentsGedPage';
import{DocumentPreview,type PreviewDocument}from'../documents/DocumentPreview';
import{promptAction}from'../../components/ui/BusinessDialog';
import type{DocumentRecord}from'../../types/documents';

type Assignment={id:string;agencyId:string;agencyName:string;status:'ACTIVE'|'SUSPENDED'|'ENDED'};
type Contract={id:string;provider_profile_id:string;provider_assignment_id:string;agency_id:string;agency_name:string;reference:string;service_subject:string;description:string|null;start_date:string;contractual_end_date:string|null;compensation_mode:'PERIODIC'|'FIXED'|'INSTALLMENTS';periodicity:'MONTHLY'|'QUARTERLY'|'YEARLY'|null;contractual_amount:number;currency:'XAF';payment_terms:string|null;special_conditions:string|null;status:'DRAFT'|'ACTIVE'|'SUSPENDED'|'ENDED'|'CANCELLED';effective_status:string;suspension_reason:string|null};
type Detail=Contract&{installments:Array<{id:string;installment_order:number;due_date:string;amount:number;description:string|null;used_at:string|null}>;requirements:Array<{id:string;document_type_id:string;document_type_name:string;is_required:boolean;required_stage:'ACTIVATION'|'PAYMENT'}>};
const field='w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs',today=()=>new Date().toISOString().slice(0,10),money=(v:number)=>new Intl.NumberFormat('fr-FR').format(v),labels:Record<string,string>={DRAFT:'Brouillon',SCHEDULED:'Planifié',ACTIVE:'Actif',EXPIRED:'Expiré',SUSPENDED:'Suspendu',ENDED:'Terminé',CANCELLED:'Annulé',PERIODIC:'Périodique',FIXED:'Forfaitaire',INSTALLMENTS:'Par échéances'};
const initial=()=>({assignmentId:'',reference:'',serviceSubject:'',description:'',startDate:today(),endDate:'',compensationMode:'FIXED',periodicity:'MONTHLY',contractualAmount:'',paymentTerms:'',specialConditions:'',installments:[{dueDate:today(),amount:'',description:''}],requirements:[]as Array<{documentTypeId:string;required:boolean;stage:'ACTIVATION'|'PAYMENT'}>});

function ContractGed({contract,onClose}:{contract:Contract;onClose:()=>void}){const can=useAuthStore(s=>s.can),docs=useEntityDocuments('provider_contract',contract.id,true),[upload,setUpload]=useState(false),[preview,setPreview]=useState<DocumentRecord|null>(null),entity={entityType:'provider_contract'as const,entityId:contract.id,agencyId:contract.agency_id,agencyName:contract.agency_name,label:`${contract.reference} · ${contract.service_subject}`,businessId:contract.reference};const download=async(d:PreviewDocument)=>{const blob=await apiDownload(`/documents/${d.id}/download`),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=d.fileName;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};return <>
<Modal isOpen onClose={onClose} title={`GED contrat prestataire · ${contract.reference}`}>
<div className="space-y-2">{can('ged.upload')&&<Button size="xs" onClick={()=>setUpload(true)}>Ajouter un document</Button>}{docs.data?.map(d=>
<div key={d.id} className="flex items-center justify-between rounded border p-2 text-xs">
<span>
<b>{d.title}</b>
<br/>{d.documentType} · version {d.version}</span>
<div className="flex gap-1">
<Button size="xs" variant="outline" onClick={()=>setPreview(d)}>Prévisualiser</Button>
<Button size="xs" variant="outline" onClick={()=>void download(d)}>Télécharger</Button>
</div>
</div>)}{docs.isSuccess&&!docs.data?.length&&<p className="rounded bg-slate-50 p-3 text-center text-xs text-slate-500">Aucun document contractuel.</p>}</div>
</Modal>
<UploadModal open={upload} close={()=>setUpload(false)} initialEntity={entity} onSuccess={()=>void docs.refetch()}/>
<DocumentPreview document={preview} onClose={()=>setPreview(null)} onDownload={d=>void download(d)}/>
</>}

export function ProviderContractsSection({providerId,assignments}:{providerId:string;assignments:Assignment[]}){const can=useAuthStore(s=>s.can),toast=useUiStore(s=>s.addToast),qc=useQueryClient(),canView=can('hr.provider.contract.view'),canManage=can('hr.provider.contract.manage'),contracts=useQuery({queryKey:['hr','provider',providerId,'contracts'],queryFn:()=>apiRequest<Contract[]>(`/hr/providers/${providerId}/contracts`),enabled:canView}),refs=useDocumentReferences(),[createOpen,setCreateOpen]=useState(false),[editingId,setEditingId]=useState<string>(),[detailId,setDetailId]=useState<string>(),[ged,setGed]=useState<Contract>(),[form,setForm]=useState(initial());const detail=useQuery({queryKey:['hr','provider-contract',detailId],queryFn:()=>apiRequest<Detail>(`/hr/provider-contracts/${detailId}`),enabled:Boolean(detailId)}),history=useQuery({queryKey:['hr','provider-contract',detailId,'history'],queryFn:()=>apiRequest<Array<{id:string;action:string;from_status:string|null;to_status:string|null;reason:string|null;actor_name:string|null;created_at:string}>>(`/hr/provider-contracts/${detailId}/history`),enabled:Boolean(detailId)}),refresh=()=>{void contracts.refetch();void detail.refetch();void history.refetch();void qc.invalidateQueries({queryKey:['documents']})};
 const run=async(task:Promise<unknown>,title:string)=>{try{await task;refresh();toast({type:'success',title});return true}catch(error){toast({type:'error',title:'Action impossible',description:error instanceof Error?error.message:'Erreur API'});return false}};
 const create=useMutation({mutationFn:(body:unknown)=>apiRequest<{id:string}>(`/hr/providers/${providerId}/contracts`,{method:'POST',body:JSON.stringify(body)})});
 const update=useMutation({mutationFn:({id,body}:{id:string;body:unknown})=>apiRequest(`/hr/provider-contracts/${id}`,{method:'PATCH',body:JSON.stringify(body)})});
 const transition=useMutation({mutationFn:({id,action,reason}:{id:string;action:string;reason?:string})=>apiRequest(`/hr/provider-contracts/${id}/${action}`,{method:'POST',body:JSON.stringify({reason})})});
 const submit=async()=>{const body={...form,endDate:form.endDate||null,contractualAmount:Number(form.contractualAmount),periodicity:form.compensationMode==='PERIODIC'?form.periodicity:null,installments:form.compensationMode==='INSTALLMENTS'?form.installments.map((x,i)=>({order:i+1,dueDate:x.dueDate,amount:Number(x.amount),description:x.description})):[],requirements:form.requirements};const ok=await run(editingId?update.mutateAsync({id:editingId,body}):create.mutateAsync(body),editingId?'Brouillon modifié':'Contrat créé en brouillon');if(ok){setCreateOpen(false);setEditingId(undefined);setForm(initial())}};
 const edit=async(c:Contract)=>{try{const d=await apiRequest<Detail>(`/hr/provider-contracts/${c.id}`);if(d.status!=='DRAFT')throw new Error('Seul un contrat brouillon peut être modifié.');setEditingId(d.id);setForm({assignmentId:d.provider_assignment_id,reference:d.reference,serviceSubject:d.service_subject,description:d.description??'',startDate:d.start_date.slice(0,10),endDate:d.contractual_end_date?.slice(0,10)??'',compensationMode:d.compensation_mode,periodicity:d.periodicity??'MONTHLY',contractualAmount:String(d.contractual_amount),paymentTerms:d.payment_terms??'',specialConditions:d.special_conditions??'',installments:d.installments.length?d.installments.map(x=>({dueDate:x.due_date.slice(0,10),amount:String(x.amount),description:x.description??''})):[{dueDate:d.start_date.slice(0,10),amount:'',description:''}],requirements:d.requirements.map(x=>({documentTypeId:x.document_type_id,required:x.is_required,stage:x.required_stage}))});setCreateOpen(true)}catch(error){toast({type:'error',title:'Modification impossible',description:error instanceof Error?error.message:'Erreur API'})}};
 const act=async(c:Contract,action:string,needsReason=false)=>{const why=needsReason?await promptAction('Motif obligatoire'):undefined;if(needsReason&&!why)return;await run(transition.mutateAsync({id:c.id,action,reason:why}),`Contrat ${action==='activate'||action==='reactivate'?'activé':action==='suspend'?'suspendu':action==='end'?'terminé':'annulé'}`)};
 if(!canView)return null;return <>
<section className="space-y-3 border-t pt-4">
<div className="flex items-center justify-between">
<h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Contrats prestataires</h4>{canManage&&<Button size="xs" onClick={()=>{setEditingId(undefined);setForm(initial());setCreateOpen(true)}}>Nouveau contrat prestataire</Button>}</div>{contracts.isLoading&&<p className="text-xs text-slate-500">Chargement des contrats…</p>}{contracts.isError&&<p className="text-xs text-red-700">Chargement des contrats impossible.</p>}{contracts.data?.map(c=>
<article key={c.id} className="rounded-md border p-3 text-xs">
<div className="flex justify-between gap-2">
<span>
<b>{c.reference} · {c.service_subject}</b>
<br/>
<span className="text-slate-500">{c.agency_name} · {labels[c.compensation_mode]} · {money(c.contractual_amount)} XAF</span>
</span>
<Badge variant={c.effective_status==='ACTIVE'?'success':c.status==='SUSPENDED'?'warning':'default'}>{labels[c.effective_status]??c.effective_status}</Badge>
</div>
<div className="mt-2 flex flex-wrap gap-1">
<Button size="xs" variant="outline" onClick={()=>setDetailId(c.id)}>Détails et historique</Button>{can('ged.view')&&<Button size="xs" variant="outline" onClick={()=>setGed(c)}>GED contrat</Button>}{canManage&&c.status==='DRAFT'&&<>
<Button size="xs" variant="outline" onClick={()=>void edit(c)}>Modifier</Button>
<Button size="xs" onClick={()=>void act(c,'activate')}>Activer</Button>
<Button size="xs" variant="outline" onClick={()=>void act(c,'cancel',true)}>Annuler</Button>
</>}{canManage&&c.status==='ACTIVE'&&<>
<Button size="xs" variant="outline" onClick={()=>void act(c,'suspend',true)}>Suspendre</Button>
<Button size="xs" variant="outline" onClick={()=>void act(c,'end',true)}>Terminer</Button>
</>}{canManage&&c.status==='SUSPENDED'&&<>
<Button size="xs" onClick={()=>void act(c,'reactivate')}>Réactiver</Button>
<Button size="xs" variant="outline" onClick={()=>void act(c,'end',true)}>Terminer</Button>
</>}</div>
</article>)}{contracts.isSuccess&&!contracts.data?.length&&<p className="rounded bg-slate-50 p-3 text-center text-xs text-slate-500">Aucun contrat prestataire.</p>}</section>
 <Modal isOpen={createOpen} onClose={()=>{setCreateOpen(false);setEditingId(undefined);setForm(initial())}} title={editingId?'Modifier le contrat prestataire':'Créer un contrat prestataire'} maxWidth="2xl">
<div className="grid gap-3 sm:grid-cols-2">
<label className="text-xs">Agence contractante *<select className={field} value={form.assignmentId} disabled={Boolean(editingId)} onChange={e=>setForm({...form,assignmentId:e.target.value})}>
<option value="">Rattachement actif</option>{assignments.filter(a=>a.status==='ACTIVE').map(a=>
<option key={a.id} value={a.id}>{a.agencyName}</option>)}</select>
</label>
<label className="text-xs">Référence *<input className={field} value={form.reference} disabled={Boolean(editingId)} onChange={e=>setForm({...form,reference:e.target.value})}/>
</label>
<label className="text-xs sm:col-span-2">Objet de la prestation *<input className={field} value={form.serviceSubject} onChange={e=>setForm({...form,serviceSubject:e.target.value})}/>
</label>
<label className="text-xs sm:col-span-2">Description<textarea className={field} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
</label>
<label className="text-xs">Début *<input type="date" className={field} value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/>
</label>
<label className="text-xs">Fin éventuelle<input type="date" className={field} value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/>
</label>
<label className="text-xs">Modalité *<select className={field} value={form.compensationMode} onChange={e=>setForm({...form,compensationMode:e.target.value})}>
<option value="PERIODIC">Périodique</option>
<option value="FIXED">Forfaitaire</option>
<option value="INSTALLMENTS">Par échéances</option>
</select>
</label>{form.compensationMode==='PERIODIC'&&<label className="text-xs">Périodicité<select className={field} value={form.periodicity} onChange={e=>setForm({...form,periodicity:e.target.value})}>
<option value="MONTHLY">Mensuelle</option>
<option value="QUARTERLY">Trimestrielle</option>
<option value="YEARLY">Annuelle</option>
</select>
</label>}<label className="text-xs">Montant contractuel XAF *<input type="number" min="1" step="0.01" className={field} value={form.contractualAmount} onChange={e=>setForm({...form,contractualAmount:e.target.value})}/>
</label>
<label className="text-xs">Modalités de rémunération<textarea className={field} value={form.paymentTerms} onChange={e=>setForm({...form,paymentTerms:e.target.value})}/>
</label>{form.compensationMode==='INSTALLMENTS'&&<div className="sm:col-span-2 rounded border p-3">
<b className="text-xs">Échéancier</b>{form.installments.map((x,i)=>
<div key={i} className="mt-2 grid grid-cols-3 gap-2">
<input aria-label="Date échéance" type="date" className={field} value={x.dueDate} onChange={e=>{const installments=[...form.installments];installments[i]={...x,dueDate:e.target.value};setForm({...form,installments})}}/>
<input aria-label="Montant échéance" type="number" min="1" className={field} value={x.amount} onChange={e=>{const installments=[...form.installments];installments[i]={...x,amount:e.target.value};setForm({...form,installments})}}/>
<input aria-label="Description échéance" className={field} value={x.description} onChange={e=>{const installments=[...form.installments];installments[i]={...x,description:e.target.value};setForm({...form,installments})}}/>
</div>)}<Button className="mt-2" size="xs" variant="outline" onClick={()=>setForm({...form,installments:[...form.installments,{dueDate:form.startDate,amount:'',description:''}]})}>Ajouter une échéance</Button>
</div>}<div className="sm:col-span-2 rounded border p-3">
<b className="text-xs">Exigences documentaires</b>
<div className="mt-2 flex gap-2">
<select id="provider-document-type" className={field}>
<option value="">Type documentaire</option>{refs.data?.types.filter(t=>t.isActive).map(t=>
<option value={t.id} key={t.id}>{t.name}</option>)}</select>
<select id="provider-document-stage" className={field}>
<option value="ACTIVATION">Exigé à l’activation</option>
<option value="PAYMENT">Exigé au paiement futur</option>
</select>
<Button size="xs" variant="outline" onClick={()=>{const documentTypeId=(document.getElementById('provider-document-type')as HTMLSelectElement)?.value,stage=(document.getElementById('provider-document-stage')as HTMLSelectElement)?.value as 'ACTIVATION'|'PAYMENT';if(documentTypeId&&!form.requirements.some(x=>x.documentTypeId===documentTypeId&&x.stage===stage))setForm({...form,requirements:[...form.requirements,{documentTypeId,required:true,stage}]})}}>Ajouter</Button>
</div>{form.requirements.map((x,i)=>
<p key={`${x.documentTypeId}-${x.stage}`} className="mt-1 text-xs">{refs.data?.types.find(t=>t.id===x.documentTypeId)?.name} · {x.stage==='ACTIVATION'?'activation':'paiement'} <button className="text-red-700" onClick={()=>setForm({...form,requirements:form.requirements.filter((_,j)=>j!==i)})}>Retirer</button>
</p>)}</div>
<label className="text-xs sm:col-span-2">Conditions particulières<textarea className={field} value={form.specialConditions} onChange={e=>setForm({...form,specialConditions:e.target.value})}/>
</label>
<p className="sm:col-span-2 rounded bg-blue-50 p-2 text-xs text-blue-800">Ce contrat enregistre un engagement. Il ne crée ni dette, ni dépense, ni paiement.</p>
<div className="sm:col-span-2 flex justify-end gap-2">
<Button variant="outline" onClick={()=>{setCreateOpen(false);setEditingId(undefined);setForm(initial())}}>Annuler</Button>
<Button loading={create.isPending||update.isPending} disabled={!form.assignmentId||!form.reference||!form.serviceSubject||!form.contractualAmount} onClick={()=>void submit()}>{editingId?'Enregistrer les modifications':'Créer le brouillon'}</Button>
</div>
</div>
</Modal>
 <Modal isOpen={Boolean(detailId)} onClose={()=>setDetailId(undefined)} title="Détails du contrat prestataire">
<div className="space-y-3 text-xs">{detail.data&&<>
<p>
<b>{detail.data.reference} · {detail.data.service_subject}</b>
<br/>{detail.data.agency_name} · {money(detail.data.contractual_amount)} XAF</p>
<div>
<b>Échéancier</b>{detail.data.installments.map(x=>
<p key={x.id}>{x.installment_order}. {x.due_date} — {money(x.amount)} XAF{x.used_at?' · verrouillée':''}</p>)}{!detail.data.installments.length&&<p>Aucun échéancier.</p>}</div>
<div>
<b>Exigences GED</b>{detail.data.requirements.map(x=>
<p key={x.id}>{x.document_type_name} · {x.required_stage==='ACTIVATION'?'activation':'paiement'}{x.is_required?' · obligatoire':''}</p>)}{!detail.data.requirements.length&&<p>Aucune exigence.</p>}</div>
<div>
<b>Historique</b>{history.data?.map(x=>
<p key={x.id}>{new Date(x.created_at).toLocaleString('fr-FR')} · {x.action} · {x.actor_name??'Système'}{x.reason?` · ${x.reason}`:''}</p>)}</div>
</>}</div>
</Modal>{ged&&<ContractGed contract={ged} onClose={()=>setGed(undefined)}/>}</>}
