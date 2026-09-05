import React, { useDeferredValue, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock, Printer, Search, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDeliveriesQuery, useDeliveryStatsQuery } from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';
import { openBusinessPdf, openDeliveryPlanningPdf } from '../../services/businessPdf';
import { useUiStore } from '../../stores/uiStore';
import { NewDeliveryModal } from './NewDeliveryModal';

export const DeliveriesPage:React.FC=()=>{
  const navigate=useNavigate(),addToast=useUiStore(s=>s.addToast);
  const [newOpen,setNewOpen]=useState(false),[search,setSearch]=useState(''),[status,setStatus]=useState(''),[date,setDate]=useState(new Date().toISOString().slice(0,10));
  const list=useDeliveriesQuery({search:useDeferredValue(search),status}),stats=useDeliveryStatsQuery(),deliveries=list.data??[];
  const error=(title:string,value:unknown)=>addToast({type:'error',title,description:value instanceof Error?value.message:'Erreur API'});
  return <div className="space-y-6">
    <PageHeader title="Livraisons véhicules" subtitle="Planification, préparation qualité, remise client et traçabilité." breadcrumbs={[{label:'Accueil',href:'/dashboard'},{label:'Livraisons'}]} actions={<div className="flex gap-2"><Button size="sm" onClick={()=>setNewOpen(true)}>Planifier</Button><Button size="sm" variant="outline" icon={<Printer className="w-4 h-4"/>} onClick={()=>openDeliveryPlanningPdf(date).catch(value=>error('Planning indisponible',value))}>Planning PDF</Button></div>}/>
    {stats.isError&&<ErrorBox error={stats.error} retry={()=>stats.refetch()}/>}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">{[['Total',stats.data?.total??0,Truck],['Planifiées',stats.data?.planned??0,CalendarDays],['En préparation',stats.data?.preparing??0,Clock],['Prêtes',stats.data?.ready??0,CheckCircle2],['Livrées',stats.data?.delivered??0,CheckCircle2]].map(([label,value,Icon]:any)=><Card key={label}><Icon className="w-4 h-4 text-[#8f1722]"/><div className="text-2xl font-bold mt-2">{value}</div><div className="text-xs text-slate-500">{label}</div></Card>)}</div>
    <Card className="flex flex-col md:flex-row gap-3"><label className="relative flex-1"><Search className="absolute left-3 top-3 w-4 h-4 text-slate-400"/><input aria-label="Rechercher une livraison" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Client, téléphone, VIN, immatriculation…" className="w-full border rounded-lg py-2.5 pl-9 pr-3 text-sm"/></label><select aria-label="Filtrer par statut" value={status} onChange={e=>setStatus(e.target.value)} className="border rounded-lg px-3 text-sm"><option value="">Tous les statuts</option><option value="planned">Planifiées</option><option value="preparing">Préparation</option><option value="quality_control">Contrôle qualité</option><option value="ready">Prêtes</option><option value="delivered">Livrées</option><option value="cancelled">Annulées</option></select><input aria-label="Date du planning PDF" type="date" value={date} onChange={e=>setDate(e.target.value)} className="border rounded-lg px-3 text-sm"/></Card>
    {list.isLoading&&<div className="p-10 text-center text-sm text-slate-500">Chargement des livraisons…</div>}
    {list.isError&&<ErrorBox error={list.error} retry={()=>list.refetch()}/>}
    {!list.isLoading&&!list.isError&&<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">{deliveries.map((item:any)=><Card key={item.id} className="space-y-4"><div className="flex justify-between"><div><div className="font-bold">{item.deliveryNumber}</div><div className="text-xs text-slate-500">{formatDate(item.deliveryDate)} {item.deliveryTimeSlot}</div></div><Badge variant={item.status==='LIVRE_SIGNE'?'success':item.status==='REPORTE'?'danger':'primary'}>{item.status.replaceAll('_',' ')}</Badge></div><div className="bg-slate-50 rounded-lg p-3 text-sm"><strong>{item.customerName}</strong><div className="text-xs text-slate-500">{item.customerPhone}</div><div className="mt-2 text-xs font-semibold">{item.vehicleLabel}</div><div className="font-mono text-[11px]">{item.vehicleVin}</div></div><div className="text-xs"><div className="flex justify-between"><span>Checklist</span><strong>{item.checklistProgress?.completed??0}/{item.checklistProgress?.total??0}</strong></div><div className="h-1.5 bg-slate-100 rounded mt-1"><div className="h-full bg-[#8f1722] rounded" style={{width:`${item.checklistProgress?.total?item.checklistProgress.completed/item.checklistProgress.total*100:0}%`}}/></div></div><div className="flex justify-end gap-2"><Button size="xs" variant="outline" onClick={()=>openBusinessPdf('delivery',item.id).catch(value=>error('PV indisponible',value))}>PV</Button><Button size="xs" onClick={()=>navigate(`/deliveries/${item.id}`)}>Ouvrir</Button></div></Card>)}{!deliveries.length&&<div className="col-span-full border border-dashed rounded-xl p-12 text-center text-sm text-slate-500">Aucune livraison ne correspond aux filtres.</div>}</div>}
    <NewDeliveryModal isOpen={newOpen} onClose={()=>setNewOpen(false)}/>
  </div>;
};

const ErrorBox:React.FC<{error:unknown;retry:()=>unknown}>=({error,retry})=><div className="p-4 border border-red-200 bg-red-50 rounded-xl text-sm text-red-800"><strong>Impossible de charger les livraisons.</strong> {error instanceof Error?error.message:'Erreur API'} <Button className="ml-2" size="xs" variant="outline" onClick={retry}>Réessayer</Button></div>;
