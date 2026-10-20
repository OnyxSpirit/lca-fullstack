import{useEffect,useState}from'react';
import{Building2,Trash2,UserRound}from'lucide-react';
import{Button}from'../../components/ui/Button';
import{apiDownload}from'../../services/apiClient';
import{DocumentFileDropField}from'../documents/DocumentFileDropField';

const ACCEPT=['image/jpeg','image/png','image/webp'] as const;

export function ProviderMediaField({identityType,file,onChange,providerId,hasCurrent=false,onRemoveCurrent}:{identityType:'INDIVIDUAL'|'COMPANY';file:File|null;onChange:(file:File|null)=>void;providerId?:string;hasCurrent?:boolean;onRemoveCurrent?:()=>void}){
 const[preview,setPreview]=useState(''),label=identityType==='COMPANY'?"Logo de l'entreprise":'Photo du prestataire',noun=identityType==='COMPANY'?'logo':'photo';
 useEffect(()=>{let active=true,url='';if(file){url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)}if(!providerId||!hasCurrent){setPreview('');return}void apiDownload(`/hr/providers/${providerId}/media`).then(blob=>{if(active){url=URL.createObjectURL(blob);setPreview(url)}}).catch(()=>{if(active)setPreview('')});return()=>{active=false;if(url)URL.revokeObjectURL(url)}},[file,providerId,hasCurrent]);
 return <div className="space-y-3 sm:col-span-2">{preview&&<div className="flex justify-center"><img src={preview} alt={`Prévisualisation ${label.toLowerCase()}`} className="h-24 w-24 rounded-full border bg-white object-cover"/></div>}{!file&&hasCurrent&&<div className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs text-slate-600">{identityType==='COMPANY'?<Building2 className="h-6 w-6"/>:<UserRound className="h-6 w-6"/>}<span>Un {noun} est déjà enregistré. Une nouvelle sélection le remplacera.</span></div>{onRemoveCurrent&&<Button type="button" size="xs" variant="outline" icon={<Trash2 className="h-3 w-3"/>} onClick={onRemoveCurrent}>Retirer {identityType==='COMPANY'?'le logo':'la photo'}</Button>}</div>}<DocumentFileDropField file={file} onChange={onChange} required={false} acceptedTypes={ACCEPT} accept="image/jpeg,image/png,image/webp" maxSize={3*1024*1024} rejectInvalid label={label} dropTitle={`Déposez ${identityType==='COMPANY'?'le logo':'la photo'} ici`} dropText="ou cliquez pour sélectionner une image" selectText="Sélectionner une image" formatsText="JPEG, PNG ou WebP — maximum 3 Mo" invalidTypeMessage="Format refusé. Utilisez JPEG, PNG ou WebP." oversizedMessage="Image trop volumineuse (3 Mo maximum)." warningClassName="text-red-700"/></div>;
}
