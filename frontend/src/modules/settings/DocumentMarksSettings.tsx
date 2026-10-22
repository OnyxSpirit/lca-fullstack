import{useEffect,useState}from'react';import{Upload}from'lucide-react';import{useDocumentMarkAdministration,useDocumentMarkPolicies,useDocumentMarkTypes,useMySignature,useServiceStamps,useSignatureActions,useStampActions,useStampCategories,type DocumentMarkType,type ServiceStamp}from'../../api/documentMarkHooks';import{apiDownload}from'../../services/apiClient';import{useAuthStore}from'../../stores/authStore';import{useUiStore}from'../../stores/uiStore';import{Badge}from'../../components/ui/Badge';import{Button}from'../../components/ui/Button';import{Card,CardDescription,CardHeader,CardTitle}from'../../components/ui/Card';import{Modal}from'../../components/ui/Modal';import{DocumentFileDropField}from'../documents/DocumentFileDropField';import{SignaturePad}from'./SignaturePad';
const field='w-full rounded border p-2 text-xs',accept='image/png,image/jpeg';
function PrivateImage({path,alt}:{path:string;alt:string}){const[url,setUrl]=useState('');useEffect(()=>{let live=true,current='';void apiDownload(path).then(blob=>{current=URL.createObjectURL(blob);if(live)setUrl(current)}).catch(()=>undefined);return()=>{live=false;if(current)URL.revokeObjectURL(current)}},[path]);return url?<img src={url} alt={alt} className="max-h-24 max-w-full object-contain"/>:<span className="text-xs text-slate-400">Aperçu protégé indisponible</span>}
const validate=(file:File)=>{if(!['image/png','image/jpeg'].includes(file.type)||file.size>2*1024*1024)throw new Error('Image PNG/JPEG de 2 Mio maximum requise');return file};
function StampDocuments({stamp,types,pending,onSave}:{stamp:ServiceStamp;types:DocumentMarkType[];pending:boolean;onSave:(documentContexts:string[])=>void}){const[selected,setSelected]=useState(stamp.documentContexts);useEffect(()=>setSelected(stamp.documentContexts),[stamp.documentContexts]);return <div className="my-2 rounded bg-slate-50 p-2"><p className="mb-1 text-[11px] font-semibold text-slate-600">Documents concernés</p><div className="flex flex-wrap gap-x-4 gap-y-1">{types.filter(type=>type.stampSupported).map(type=><label key={type.code} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={selected.includes(type.code)} onChange={event=>setSelected(event.target.checked?[...selected,type.code]:selected.filter(code=>code!==type.code))}/>{type.label}</label>)}</div><Button className="mt-2" size="xs" variant="outline" disabled={pending||selected.length===0||selected.join('|')===stamp.documentContexts.join('|')} onClick={()=>onSave(selected)}>Enregistrer les documents</Button></div>}
export function DocumentMarksSettings({personalOnly=false}:{personalOnly?:boolean}={}){const can=useAuthStore(s=>s.can),toast=useUiStore(s=>s.addToast),canViewSig=can('signature.view.self'),canManageSig=can('signature.manage.self'),canViewStamp=!personalOnly&&can('stamp.view'),canManageStamp=!personalOnly&&can('stamp.manage'),signatures=useMySignature(canViewSig),signatureActions=useSignatureActions(),stamps=useServiceStamps(canViewStamp),categories=useStampCategories(canViewStamp),types=useDocumentMarkTypes(canViewStamp),policies=useDocumentMarkPolicies(canViewStamp),stampActions=useStampActions(),admin=useDocumentMarkAdministration(),[signatureMode,setSignatureMode]=useState<'import'|'draw'>('import'),[category,setCategory]=useState({name:'',description:''}),[stamp,setStamp]=useState({name:'',categoryId:'',documentContexts:['DELIVERY_REPORT']}),[file,setFile]=useState<File|null>(null),[revokeTarget,setRevokeTarget]=useState<ServiceStamp|null>(null),[revokeReason,setRevokeReason]=useState(''),[deleteTarget,setDeleteTarget]=useState<ServiceStamp|null>(null),run=async(job:()=>Promise<unknown>,title:string)=>{try{await job();toast({type:'success',title});return true}catch(error){toast({type:'error',title:'Opération impossible',description:error instanceof Error?error.message:'Erreur API'});return false}},active=signatures.data?.find(x=>x.isActive),saveSignature=(next:File)=>run(()=>signatureActions.upload.mutateAsync(validate(next)),active?'Signature remplacée':'Signature enregistrée');if(!canViewSig&&!canViewStamp)return null;
return <div className="space-y-4">
{canViewSig&&<Card>
<CardHeader>
<div>
<CardTitle>Mon profil · Ma signature</CardTitle>
<CardDescription>Fac-similé personnel versionné. Les documents déjà émis restent inchangés.</CardDescription>
</div>{active?<Badge variant="success">Active · v{active.version}</Badge>:<Badge variant="default">Non configurée</Badge>}</CardHeader>{active&&<div className="mb-4 flex min-h-28 items-center justify-center rounded border bg-white p-3">
<PrivateImage path={`/document-marks/signature/me/${active.id}/image`} alt="Signature personnelle active"/>
</div>}{canManageSig&&<>
<div className="mb-3 flex gap-2">
<Button size="xs" variant={signatureMode==='import'?'primary':'outline'} onClick={()=>setSignatureMode('import')}>Importer une signature</Button>
<Button size="xs" variant={signatureMode==='draw'?'primary':'outline'} onClick={()=>setSignatureMode('draw')}>Dessiner une signature</Button>
</div>{signatureMode==='import'?<label className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-[#8f1722] px-3 py-2 text-xs font-semibold text-white">
<Upload className="h-4 w-4"/>{active?'Remplacer':'Importer'}<input className="sr-only" type="file" accept={accept} onChange={e=>{const next=e.target.files?.[0];if(next)void saveSignature(next);e.target.value=''}}/>
</label>:<SignaturePad pending={signatureActions.upload.isPending} onSave={saveSignature}/>} {active&&<Button variant="outline" size="xs" onClick={()=>void run(()=>signatureActions.revoke.mutateAsync(),'Signature révoquée')}>Révoquer</Button>}</>}<p className="mt-3 text-[11px] text-slate-500">PNG/JPEG, 2 Mio maximum. Ce fac-similé n’est pas une signature électronique qualifiée.</p>
</Card>}
{canViewStamp&&<>
<Card>
<CardHeader>
<div>
<CardTitle>Catégories de cachets</CardTitle>
<CardDescription>Référentiel dynamique de la concession.</CardDescription>
</div>
</CardHeader>{canManageStamp&&<form className="mb-4 grid gap-2 md:grid-cols-[1fr_2fr_auto]" onSubmit={e=>{e.preventDefault();void run(()=>admin.createCategory.mutateAsync(category),'Catégorie créée').then(()=>setCategory({name:'',description:''}))}}>
<input required className={field} placeholder="Nom" value={category.name} onChange={e=>setCategory({...category,name:e.target.value})}/>
<input className={field} placeholder="Description" value={category.description} onChange={e=>setCategory({...category,description:e.target.value})}/>
<Button type="submit">Créer</Button>
</form>}{categories.data?.map(c=>
<div key={c.id} className="mb-2 flex items-center justify-between rounded border p-2 text-xs">
<span>
<b>{c.name}</b> · {c.description||'Sans description'}</span>
<div className="flex gap-2">
<Badge variant={c.is_active?'success':'default'}>{c.is_active?'Active':'Inactive'}</Badge>{canManageStamp&&<Button size="xs" variant="outline" onClick={()=>void run(()=>admin.updateCategory.mutateAsync({id:c.id,name:c.name,description:c.description??'',isActive:!c.is_active}),c.is_active?'Catégorie désactivée':'Catégorie activée')}>{c.is_active?'Désactiver':'Activer'}</Button>}</div>
</div>)}</Card>
<Card>
<CardHeader>
<div>
<CardTitle>Cachets institutionnels</CardTitle>
<CardDescription>Images versionnées, limitées par catégorie, document, rôle et périmètre.</CardDescription>
</div>
</CardHeader>{canManageStamp&&<form className="mb-4 grid gap-2 md:grid-cols-2" onSubmit={e=>{e.preventDefault();if(file)void run(()=>stampActions.create.mutateAsync({...stamp,file:validate(file)}),'Cachet créé').then(ok=>{if(ok){setStamp({...stamp,name:''});setFile(null)}})}}>
<input required className={field} placeholder="Nom du cachet" value={stamp.name} onChange={e=>setStamp({...stamp,name:e.target.value})}/>
<select required className={field} value={stamp.categoryId} onChange={e=>setStamp({...stamp,categoryId:e.target.value})}>
<option value="">Catégorie</option>{categories.data?.filter(c=>c.is_active).map(c=>
<option key={c.id} value={c.id}>{c.name}</option>)}</select>
<fieldset className="rounded border p-2 text-xs"><legend className="px-1 font-semibold">Documents concernés</legend><div className="grid gap-1 sm:grid-cols-2">{types.data?.filter(t=>t.stampSupported).map(t=><label key={t.code} className="flex items-center gap-2"><input type="checkbox" checked={stamp.documentContexts.includes(t.code)} onChange={e=>setStamp({...stamp,documentContexts:e.target.checked?[...stamp.documentContexts,t.code]:stamp.documentContexts.filter(code=>code!==t.code)})}/>{t.label}</label>)}</div></fieldset>
<DocumentFileDropField file={file} onChange={setFile} disabled={stampActions.create.isPending} required={false} acceptedTypes={['image/png','image/jpeg']} accept={accept} maxSize={2*1024*1024} rejectInvalid label="Image du cachet *" dropTitle="Glissez-déposez votre cachet ici" dropText="ou cliquez pour sélectionner une image" selectText="Sélectionner une image" formatsText="PNG ou JPEG — maximum 2 Mio" invalidTypeMessage="Format interdit. Sélectionnez une image PNG ou JPEG." oversizedMessage="Cette image dépasse la limite de 2 Mio." warningClassName="text-red-700"/>
<Button type="submit" loading={stampActions.create.isPending} disabled={!file||stamp.documentContexts.length===0}>Créer le cachet</Button>
</form>}{stamps.data?.map(s=>
<div key={s.id} className="mb-3 rounded border p-3">
<div className="flex justify-between gap-3">
<span>
<b>{s.name}</b>
<small className="block text-slate-500">{s.documentContexts.map(code=>types.data?.find(t=>t.code===code)?.label??code).join(' · ')} · {categories.data?.find(c=>c.id===s.categoryId)?.name??'Sans catégorie'}</small>{s.revokedAt&&<small className="block font-medium text-red-700">Révoqué le {new Intl.DateTimeFormat('fr-FR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(s.revokedAt))} · {s.revocationReason}</small>}</span>
<Badge variant={s.revokedAt?'danger':s.isActive?'success':'default'}>{s.revokedAt?'Révoqué':s.isActive?'Actif':'Inactif'}</Badge>
</div>{s.activeVersion&&<div className="my-2 flex justify-center bg-slate-50 p-2">
<PrivateImage path={`/document-marks/stamps/${s.id}/versions/${s.activeVersion.id}/image`} alt={`Cachet ${s.name}`}/>
</div>}{canManageStamp&&!s.revokedAt&&<StampDocuments stamp={s} types={types.data??[]} pending={stampActions.documents.isPending} onSave={documentContexts=>void run(()=>stampActions.documents.mutateAsync({id:s.id,documentContexts}),'Affectations documentaires enregistrées')}/>} {canManageStamp&&<div className="mt-2 flex flex-wrap gap-2">{!s.revokedAt&&<>
<label className="cursor-pointer rounded border px-2 py-1 text-xs">Nouvelle version<input className="sr-only" type="file" accept={accept} onChange={e=>{const next=e.target.files?.[0];if(next)void run(()=>stampActions.replace.mutateAsync({id:s.id,file:validate(next)}),'Cachet remplacé');e.target.value=''}}/>
</label>
<Button size="xs" variant="outline" onClick={()=>void run(()=>stampActions.status.mutateAsync({id:s.id,isActive:!s.isActive}),s.isActive?'Cachet désactivé':'Cachet activé')}>{s.isActive?'Désactiver':'Activer'}</Button>
<Button size="xs" variant="danger" onClick={()=>{setRevokeReason('');setRevokeTarget(s)}}>Révoquer le cachet</Button>
</>}<Button size="xs" variant="outline" onClick={()=>setDeleteTarget(s)}>Supprimer le cachet</Button>
</div>}</div>)}</Card>
<Card>
<CardHeader>
<div>
<CardTitle>Documents officiels · Politiques</CardTitle>
<CardDescription>Seuls les générateurs reliés au moteur de politiques sont configurables ici. Sans politique active, le comportement historique est conservé.</CardDescription>
</div>
</CardHeader>{policies.isLoading&&<p className="text-xs text-slate-500">Chargement des politiques…</p>}{policies.isError&&<p className="text-xs text-red-700">Chargement des politiques impossible.</p>}{!policies.isLoading&&!policies.isError&&types.data?.filter(type=>type.policyManaged).map(type=>{const p=policies.data?.find(x=>x.document_type===type.code&&x.agency_id==null),policyKey=[type.code,p?.id,p?.signature_required,p?.stamp_required,p?.missing_mark_behavior,p?.default_stamp_id,p?.is_active].join(':');return <form key={policyKey} className="mb-3 grid items-center gap-2 rounded border p-3 text-xs md:grid-cols-6" onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void run(()=>admin.savePolicy.mutateAsync({documentType:type.code,signatureRequired:d.get('signature')==='on',stampRequired:d.get('stamp')==='on',missingMarkBehavior:String(d.get('behavior')),defaultStampId:String(d.get('defaultStamp')||''),isActive:d.get('active')==='on'}),'Politique enregistrée')}}>
<b>{type.label}<small className="block text-slate-500">État : {type.triggerStatus}</small>
</b>
<label>
<input name="signature" type="checkbox" defaultChecked={p?.signature_required}/> Signature</label>
<label>
<input name="stamp" type="checkbox" defaultChecked={p?.stamp_required}/> Cachet</label>
<select name="defaultStamp" className={field} defaultValue={p?.default_stamp_id??''}>
<option value="">Défaut automatique</option>{stamps.data?.filter(s=>s.documentContexts.includes(type.code)&&s.isActive&&!s.revokedAt).map(s=>
<option key={s.id} value={s.id}>{s.name}</option>)}</select>
<select name="behavior" className={field} defaultValue={p?.missing_mark_behavior??'BLOCK'}>
<option value="BLOCK">Bloquer si absent</option>
<option value="ALLOW_WITHOUT_MARK">Autoriser sans marque</option>
</select>
<div className="flex gap-2">
<label>
<input name="active" type="checkbox" defaultChecked={p?.is_active??true}/> Active</label>{canManageStamp&&<Button size="xs" type="submit" loading={admin.savePolicy.isPending}>Enregistrer</Button>}</div>
</form>})}</Card>
</>}<Modal isOpen={Boolean(revokeTarget)} onClose={()=>setRevokeTarget(null)} title="Révoquer le cachet" description="Cette action est définitive pour les nouvelles opérations. Les documents historiques restent inchangés." maxWidth="md">
<form className="space-y-3" onSubmit={e=>{e.preventDefault();if(!revokeTarget)return;void run(()=>stampActions.revoke.mutateAsync({id:revokeTarget.id,reason:revokeReason}),'Cachet révoqué').then(ok=>{if(ok)setRevokeTarget(null)})}}>
<p className="text-sm">Confirmez la révocation de <b>{revokeTarget?.name}</b>.</p>
<textarea required minLength={3} maxLength={500} className={field} rows={4} value={revokeReason} onChange={e=>setRevokeReason(e.target.value)} placeholder="Motif de la révocation"/>
<div className="flex justify-end gap-2">
<Button type="button" variant="outline" onClick={()=>setRevokeTarget(null)}>Annuler</Button>
<Button type="submit" variant="danger" disabled={stampActions.revoke.isPending||revokeReason.trim().length<3}>Révoquer le cachet</Button>
</div>
</form>
</Modal>
<Modal isOpen={Boolean(deleteTarget)} onClose={()=>setDeleteTarget(null)} title="Supprimer le cachet" description="La suppression n’est autorisée que si ce cachet n’a jamais été utilisé." maxWidth="md">
<div className="space-y-3">
<p className="text-sm">Supprimer définitivement <b>{deleteTarget?.name}</b> ? Le serveur contrôlera toutes les références documentaires et historiques.</p>
<div className="flex justify-end gap-2">
<Button variant="outline" onClick={()=>setDeleteTarget(null)}>Annuler</Button>
<Button variant="danger" disabled={stampActions.remove.isPending} onClick={()=>{if(!deleteTarget)return;void run(()=>stampActions.remove.mutateAsync(deleteTarget.id),'Cachet supprimé').then(ok=>{if(ok)setDeleteTarget(null)})}}>Supprimer le cachet</Button>
</div>
</div>
</Modal>
</div>}
