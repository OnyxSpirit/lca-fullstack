import{useEffect,useState}from'react';
import{Trash2,UserRound}from'lucide-react';
import{Button}from'../../components/ui/Button';
import{DocumentFileDropField}from'../documents/DocumentFileDropField';

const ACCEPT=['image/jpeg','image/png','image/webp'] as const;

export function EmployeePhotoField({file,onChange,hasCurrent=false,onRemoveCurrent}:{file:File|null;onChange:(file:File|null)=>void;hasCurrent?:boolean;onRemoveCurrent?:()=>void}){
 const[preview,setPreview]=useState('');
 useEffect(()=>{if(!file){setPreview('');return}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url)},[file]);
 return <div className="space-y-3 sm:col-span-2">{preview&&<div className="flex justify-center"><img src={preview} alt="Prévisualisation de la photographie sélectionnée" className="h-24 w-24 rounded-full border bg-white object-cover"/></div>}{!file&&hasCurrent&&<div className="flex items-center justify-between gap-3 rounded-md border bg-slate-50 p-3"><div className="flex items-center gap-2 text-xs text-slate-600"><UserRound className="h-6 w-6"/><span>Une photographie est déjà enregistrée. Une nouvelle sélection la remplacera.</span></div>{onRemoveCurrent&&<Button type="button" size="xs" variant="outline" icon={<Trash2 className="h-3 w-3"/>} onClick={onRemoveCurrent}>Retirer la photographie</Button>}</div>}<DocumentFileDropField file={file} onChange={onChange} required={false} acceptedTypes={ACCEPT} accept="image/jpeg,image/png,image/webp" maxSize={3*1024*1024} rejectInvalid label="Photo de l’employé" dropTitle="Déposez la photographie ici" dropText="ou cliquez pour sélectionner une image" selectText="Sélectionner une image" formatsText="JPEG, PNG ou WebP — maximum 3 Mo" invalidTypeMessage="Format refusé. Utilisez JPEG, PNG ou WebP." oversizedMessage="Photographie trop volumineuse (3 Mo maximum)." warningClassName="text-red-700"/></div>;
}
