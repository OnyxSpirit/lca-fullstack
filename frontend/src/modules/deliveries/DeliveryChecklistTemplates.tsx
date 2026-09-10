import React,{useState}from'react';
import{useDeliveryTemplateActions,useDeliveryTemplatesQuery}from'../../api/erpHooks';
import{Button}from'../../components/ui/Button';
import{Card,CardHeader,CardTitle}from'../../components/ui/Card';
import{useUiStore}from'../../stores/uiStore';

const blank={itemName:'',category:'preparation',isRequired:true,sortOrder:10,isActive:true};
export const DeliveryChecklistTemplates:React.FC=()=>{
  const query=useDeliveryTemplatesQuery(),actions=useDeliveryTemplateActions(),toast=useUiStore(s=>s.addToast),[form,setForm]=useState(blank),[editing,setEditing]=useState('');
  const pending=actions.create.isPending||actions.update.isPending;
  const save=async(event:React.FormEvent)=>{event.preventDefault();if(pending)return;try{if(editing)await actions.update.mutateAsync({id:editing,...form});else await actions.create.mutateAsync(form);setForm(blank);setEditing('');toast({type:'success',title:'Modèle de checklist enregistré'})}catch(error){toast({type:'error',title:'Paramétrage impossible',description:error instanceof Error?error.message:'Erreur API'})}};
  return <Card><CardHeader><div><CardTitle>Modèles de checklist Livraison</CardTitle><p className="text-xs text-slate-500">Paramétrage Direction / Super Administrateur. Les éléments Documents alimentent la liste des remises physiques.</p></div></CardHeader><div className="grid gap-4 lg:grid-cols-2">
    <div className="space-y-2">{query.data?.map(item=><button key={item.id} className="w-full rounded border p-2 text-left text-xs" onClick={()=>{setEditing(String(item.id));setForm({itemName:item.item_name,category:item.category,isRequired:Boolean(item.is_required),sortOrder:Number(item.sort_order),isActive:Boolean(item.is_active)})}}><strong>{item.item_name}</strong><span className="ml-2 text-slate-500">{item.category} · ordre {item.sort_order} · {item.is_active?'actif':'inactif'}</span></button>)}</div>
    <form className="space-y-2" onSubmit={save}><input required value={form.itemName} onChange={e=>setForm({...form,itemName:e.target.value})} placeholder="Nom" className="w-full rounded border p-2 text-sm"/><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})} className="w-full rounded border p-2 text-sm"><option value="preparation">Préparation</option><option value="quality">Contrôle qualité</option><option value="documents">Documents remis</option><option value="handover">Remise client</option></select><input type="number" min="0" value={form.sortOrder} onChange={e=>setForm({...form,sortOrder:Number(e.target.value)})} className="w-full rounded border p-2 text-sm"/><label className="mr-4 text-xs"><input type="checkbox" checked={form.isRequired} onChange={e=>setForm({...form,isRequired:e.target.checked})}/> Obligatoire</label><label className="text-xs"><input type="checkbox" checked={form.isActive} onChange={e=>setForm({...form,isActive:e.target.checked})}/> Actif</label><div><Button size="sm" type="submit" loading={pending}>{editing?'Modifier':'Ajouter'}</Button>{editing&&<Button size="sm" type="button" variant="outline" className="ml-2" onClick={()=>{setEditing('');setForm(blank)}}>Annuler</Button>}</div></form>
  </div></Card>;
};
