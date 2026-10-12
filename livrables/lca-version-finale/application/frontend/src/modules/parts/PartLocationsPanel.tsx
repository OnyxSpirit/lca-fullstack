import React,{useEffect,useState} from 'react';
import {usePartLocationAgenciesQuery,usePartLocationsQuery,useSavePartLocation,type PartLocation} from '../../api/erpHooks';
import {Card} from '../../components/ui/Card';
import {Button} from '../../components/ui/Button';
import {Modal} from '../../components/ui/Modal';
import {useAuthStore} from '../../stores/authStore';
import {useUiStore} from '../../stores/uiStore';

const blank={name:'',address:'',isActive:true};
interface Props {agencyId?:string;agencyName?:string;canManage:boolean}
export const PartLocationsPanel:React.FC<Props>=({agencyId,agencyName,canManage})=>{
  const actorId=useAuthStore(state=>state.currentUser?.id);
  const toast=useUiStore(state=>state.addToast);
  const [selectedAgency,setSelectedAgency]=useState(agencyId??'');
  const [editing,setEditing]=useState<PartLocation|null>(null);
  const [formOpen,setFormOpen]=useState(false);
  const [form,setForm]=useState({...blank});
  const agenciesQuery=usePartLocationAgenciesQuery(actorId,canManage);
  const agencies=canManage&&agenciesQuery.data?.length?agenciesQuery.data:[{id:agencyId??'',name:agencyName??'Agence',code:''}];
  const locations=usePartLocationsQuery(selectedAgency,actorId);
  const save=useSavePartLocation();
  useEffect(()=>{if(!selectedAgency&&agencyId)setSelectedAgency(agencyId)},[agencyId,selectedAgency]);
  useEffect(()=>{if(agenciesQuery.data?.length&&!agenciesQuery.data.some(item=>item.id===selectedAgency))setSelectedAgency(agenciesQuery.data[0].id)},[agenciesQuery.data,selectedAgency]);
  const close=()=>{setFormOpen(false);setEditing(null);setForm({...blank})};
  const openCreate=()=>{setEditing(null);setForm({...blank});setFormOpen(true)};
  const openEdit=(item:PartLocation)=>{setEditing(item);setForm({name:item.name,address:item.address,isActive:item.isActive});setFormOpen(true)};
  const submit=async(event:React.FormEvent)=>{
    event.preventDefault();
    if(!selectedAgency)return;
    try{
      await save.mutateAsync({id:editing?.id,targetAgency:selectedAgency,...form});
      toast({type:'success',title:editing?'Emplacement modifié':'Emplacement créé'});
      close();
    }catch(error){toast({type:'error',title:'Enregistrement impossible',description:error instanceof Error?error.message:'Erreur API'})}
  };
  return <>
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div><h2 className="font-bold">Emplacements PR</h2><p className="text-xs text-slate-500">Emplacements de magasin rattachés à une agence.</p></div>
        {canManage&&<Button size="sm" onClick={openCreate} disabled={!selectedAgency}>Nouvel emplacement</Button>}
      </div>
      <label className="block max-w-xs text-xs font-semibold mb-4">Agence
        <select className="mt-1 w-full p-2 border rounded" value={selectedAgency} onChange={event=>{setSelectedAgency(event.target.value);close()}}>
          {agencies.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {agenciesQuery.isError&&canManage&&<p className="text-xs text-red-700 mb-3">Chargement des agences impossible : {agenciesQuery.error.message}</p>}
      {locations.isError?<p className="text-xs text-red-700">Chargement des emplacements impossible : {locations.error.message}</p>:<div className="overflow-x-auto"><table className="w-full min-w-[560px] text-xs"><thead className="text-left bg-slate-50"><tr><th className="p-2">Libellé</th><th>Adresse / repère</th><th>Agence</th><th>Statut</th><th>Action</th></tr></thead><tbody>{locations.data?.map(item=><tr key={item.id} className="border-t"><td className="p-2 font-semibold">{item.name}</td><td>{item.address||'—'}</td><td>{item.agencyName}</td><td>{item.isActive?'Actif':'Inactif'}</td><td>{canManage&&<Button size="xs" variant="outline" onClick={()=>openEdit(item)}>Modifier</Button>}</td></tr>)}</tbody></table>{locations.isSuccess&&!locations.data.length&&<p className="p-5 text-center text-slate-500">Aucun emplacement PR pour cette agence.</p>}</div>}
    </Card>
    <Modal isOpen={formOpen} onClose={close} title={editing?'Modifier l’emplacement PR':'Nouvel emplacement PR'} maxWidth="md">
      <form onSubmit={submit} className="space-y-3">
        <label className="block text-xs font-semibold">Agence
          <select className="mt-1 w-full p-2 border rounded" value={selectedAgency} onChange={event=>setSelectedAgency(event.target.value)} disabled={Boolean(editing)} required>
            {agencies.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label className="block text-xs font-semibold">Libellé *<input className="mt-1 w-full p-2 border rounded" required maxLength={120} value={form.name} onChange={event=>setForm({...form,name:event.target.value})}/></label>
        <label className="block text-xs font-semibold">Adresse / repère<textarea className="mt-1 w-full p-2 border rounded" maxLength={4000} value={form.address} onChange={event=>setForm({...form,address:event.target.value})}/></label>
        <label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={form.isActive} onChange={event=>setForm({...form,isActive:event.target.checked})}/> Actif</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={close}>Annuler</Button><Button type="submit" disabled={save.isPending||!selectedAgency}>{editing?'Enregistrer':'Créer'}</Button></div>
      </form>
    </Modal>
  </>;
};
