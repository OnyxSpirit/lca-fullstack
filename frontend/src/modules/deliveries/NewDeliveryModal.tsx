import React,{useEffect,useState}from'react';
import{useCreateDelivery,useDeliveryCandidatesQuery,useUsersQuery}from'../../api/erpHooks';
import{Button}from'../../components/ui/Button';
import{Modal}from'../../components/ui/Modal';
import{useAuthStore}from'../../stores/authStore';
import{useUiStore}from'../../stores/uiStore';

export const NewDeliveryModal:React.FC<{isOpen:boolean;onClose:()=>void;initialSaleId?:string}>=({isOpen,onClose,initialSaleId})=>{
  const candidates=useDeliveryCandidatesQuery(),users=useUsersQuery(),create=useCreateDelivery(),auth=useAuthStore(),addToast=useUiStore(s=>s.addToast);
  const sales=(candidates.data??[]).map((row:any)=>({id:String(row.sale_id),saleNumber:row.sale_number,customerName:row.customer_name,vehicleLabel:row.vehicle_label}));
  const specialists=(users.data??[]).filter(user=>user.status==='active'&&user.roles.includes('DELIVERY_MANAGER')&&user.agencyId===auth.currentAgency?.id);
  const[saleId,setSaleId]=useState(''),[deliverySpecialistId,setDeliverySpecialistId]=useState(''),[scheduledAt,setScheduledAt]=useState(''),[notes,setNotes]=useState('');
  useEffect(()=>{if(isOpen){setSaleId(initialSaleId&&sales.some(s=>s.id===initialSaleId)?initialSaleId:(sales[0]?.id??''));setDeliverySpecialistId(specialists[0]?.id??'')}},[isOpen,initialSaleId,candidates.data,users.data]);
  const submit=async(event:React.FormEvent)=>{event.preventDefault();if(create.isPending)return;try{await create.mutateAsync({saleId,deliverySpecialistId,scheduledAt:new Date(scheduledAt).toISOString(),customerNotes:notes||undefined});addToast({type:'success',title:'Livraison planifiée',description:'Le Responsable livraison et la checklist ont été enregistrés.'});onClose()}catch(error){addToast({type:'error',title:'Planification impossible',description:error instanceof Error?error.message:'Erreur API'})}};
  return <Modal isOpen={isOpen} onClose={onClose} title="Planifier une livraison" description="Seules les ventes prêtes à livrer sont proposées." maxWidth="md"><form onSubmit={submit} className="space-y-4">
    <label className="block text-xs font-semibold text-slate-700">Vente prête<select required value={saleId} onChange={e=>setSaleId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm"><option value="">Sélectionner…</option>{sales.map(s=><option key={s.id} value={s.id}>{s.saleNumber} — {s.customerName} — {s.vehicleLabel}</option>)}</select></label>
    <label className="block text-xs font-semibold text-slate-700">Responsable livraison<select required value={deliverySpecialistId} onChange={e=>setDeliverySpecialistId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm"><option value="">Sélectionner…</option>{specialists.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
    <label className="block text-xs font-semibold text-slate-700">Date et heure<input required type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm"/></label>
    <label className="block text-xs font-semibold text-slate-700">Notes client<textarea value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm" rows={3}/></label>
    {!sales.length&&<p className="text-xs text-amber-700">Aucune vente n’est actuellement prête à livrer.</p>}{!specialists.length&&<p className="text-xs text-amber-700">Aucun Responsable livraison actif n’est disponible dans cette agence.</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Annuler</Button><Button type="submit" disabled={!saleId||!deliverySpecialistId||!scheduledAt} loading={create.isPending}>Planifier</Button></div>
  </form></Modal>;
};
