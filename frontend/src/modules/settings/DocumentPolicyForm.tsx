import{useMutation,useQueryClient}from'@tanstack/react-query';
import{apiRequest}from'../../services/apiClient';
import{useUiStore}from'../../stores/uiStore';
import{Button}from'../../components/ui/Button';
import type{DocumentMarkPolicy,DocumentMarkType,ServiceStamp}from'../../api/documentMarkHooks';

const field='w-full rounded border p-2 text-xs';
const triggerLabels:Record<string,string>={issued:'Émission',confirmed:'Confirmation'};

export function DocumentPolicyForm({type,policy,stamps,canManage}:{type:DocumentMarkType;policy?:DocumentMarkPolicy;stamps:ServiceStamp[];canManage:boolean}){
 const queryClient=useQueryClient(),toast=useUiStore(state=>state.addToast);
 const save=useMutation({mutationKey:['document-marks','policy',type.code],mutationFn:(body:{signatureRequired:boolean;stampRequired:boolean;missingMarkBehavior:string;defaultStampId?:string;isActive:boolean})=>apiRequest(`/document-marks/policies/${type.code}`,{method:'PUT',body:JSON.stringify(body)}),onSuccess:async()=>{await queryClient.invalidateQueries({queryKey:['document-marks','policies']});toast({type:'success',title:`Règles d’émission enregistrées — ${type.label}`})},onError:error=>toast({type:'error',title:`Enregistrement impossible — ${type.label}`,description:error instanceof Error?error.message:'Erreur API'})});
 const policyKey=[type.code,policy?.id,policy?.signature_required,policy?.stamp_required,policy?.missing_mark_behavior,policy?.default_stamp_id,policy?.is_active].join(':');
 return <form key={policyKey} className="mb-3 grid items-center gap-2 rounded border p-3 text-xs md:grid-cols-6" onSubmit={event=>{event.preventDefault();const data=new FormData(event.currentTarget);save.mutate({signatureRequired:data.get('signature')==='on',stampRequired:data.get('stamp')==='on',missingMarkBehavior:String(data.get('behavior')),defaultStampId:String(data.get('defaultStamp')||''),isActive:data.get('active')==='on'})}}>
  <b>{type.label}<small className="block text-slate-500">Déclenchement : {triggerLabels[type.triggerStatus]??'Étape documentaire configurée'}</small></b>
  <label><input name="signature" type="checkbox" defaultChecked={policy?.signature_required}/> Signature requise</label>
  <label><input name="stamp" type="checkbox" defaultChecked={policy?.stamp_required}/> Cachet requis</label>
  <select name="defaultStamp" className={field} defaultValue={policy?.default_stamp_id??''}><option value="">Sélection automatique</option>{stamps.filter(stamp=>stamp.documentContexts.includes(type.code)&&stamp.isActive&&!stamp.revokedAt).map(stamp=><option key={stamp.id} value={stamp.id}>{stamp.name}</option>)}</select>
  <select name="behavior" className={field} defaultValue={policy?.missing_mark_behavior??'BLOCK'}><option value="BLOCK">Bloquer si un élément requis manque</option><option value="ALLOW_WITHOUT_MARK">Autoriser malgré un élément manquant</option></select>
  <div className="flex gap-2"><label><input name="active" type="checkbox" defaultChecked={policy?.is_active??true}/> Règle active</label>{canManage&&<Button size="xs" type="submit" loading={save.isPending}>Enregistrer</Button>}</div>
 </form>
}
