import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, ExternalLink, Gauge, Plus, UserRound, Warehouse, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  useAssignRepairOrder,
  useRepairOrdersQuery,
  useTechniciansQuery,
  useWorkshopBaysQuery,
  useWorkshopPlanningQuery,
  useWorkshopScheduleMutation,
  useWorkshopStatsQuery,
  useWorkshopUnavailabilitiesQuery,
  useWorkshopUnavailabilityMutation,
} from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import type { Technician, TechnicianUnavailability, WorkshopBay, WorkshopSchedule } from '../../types';

const START_HOUR=8;
const END_HOUR=18;
const TOTAL_MINUTES=(END_HOUR-START_HOUR)*60;
const HOURS=Array.from({length:END_HOUR-START_HOUR+1},(_,index)=>START_HOUR+index);
const WEEK_DAYS=['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const statusLabel:Record<string,string>={planned:'Planifié',confirmed:'Confirmé',in_progress:'En cours',completed:'Terminé',cancelled:'Annulé'};
const iso=(date:Date)=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const addDays=(date:string,days:number)=>{const value=new Date(`${date}T12:00:00`);value.setDate(value.getDate()+days);return iso(value)};
const toLocalInput=(value:string)=>String(value??'').replace(' ','T').slice(0,16);
const toSqlDate=(value:string)=>value.replace('T',' ');
const minutesFromStart=(value:string)=>{const date=new Date(toLocalInput(value));return date.getHours()*60+date.getMinutes()-START_HOUR*60};
const segmentMinutes=(startsAt:string,endsAt:string,day:string)=>{const startDay=toLocalInput(startsAt).slice(0,10),endDay=toLocalInput(endsAt).slice(0,10);const start=startDay<day?0:Math.max(0,Math.min(TOTAL_MINUTES,minutesFromStart(startsAt)));const end=endDay>day?TOTAL_MINUTES:Math.max(start+15,Math.min(TOTAL_MINUTES,minutesFromStart(endsAt)));return{start,end}};
const blockStyle=(startsAt:string,endsAt:string,day:string)=>{const{start,end}=segmentMinutes(startsAt,endsAt,day);return{left:`${start/TOTAL_MINUTES*100}%`,width:`${Math.max(2,(end-start)/TOTAL_MINUTES*100)}%`}};
const verticalStyle=(startsAt:string,endsAt:string,day:string)=>{const{start,end}=segmentMinutes(startsAt,endsAt,day);return{top:`${start/TOTAL_MINUTES*100}%`,height:`${Math.max(8,(end-start)/TOTAL_MINUTES*100)}%`}};

interface AssignmentForm { repairOrderId:string; technicianId:string; bayId:string; startsAt:string; endsAt:string }
const emptyAssignment=(date:string):AssignmentForm=>({repairOrderId:'',technicianId:'',bayId:'',startsAt:`${date}T08:00`,endsAt:`${date}T09:00`});

export const WorkshopPlanningPage:React.FC=()=>{
  const navigate=useNavigate();
  const agency=useAuthStore(state=>state.currentAgency);
  const {addToast}=useUiStore();
  const [date,setDate]=useState(iso(new Date()));
  const [mode,setMode]=useState<'day'|'week'>('day');
  const [axis,setAxis]=useState<'technician'|'bay'>('technician');
  const [technicianFilter,setTechnicianFilter]=useState('');
  const [bayFilter,setBayFilter]=useState('');
  const [selected,setSelected]=useState<WorkshopSchedule|null>(null);
  const [newOpen,setNewOpen]=useState(false);
  const [absenceOpen,setAbsenceOpen]=useState(false);
  const [assignment,setAssignment]=useState<AssignmentForm>(emptyAssignment(date));
  const [absence,setAbsence]=useState({technicianId:'',reason:'',startsAt:`${date}T08:00`,endsAt:`${date}T09:00`});
  const monday=addDays(date,-((new Date(`${date}T12:00:00`).getDay()+6)%7));
  const from=mode==='day'?date:monday;
  const to=mode==='day'?date:addDays(monday,6);
  const techniciansQuery=useTechniciansQuery(agency?.id);
  const baysQuery=useWorkshopBaysQuery(agency?.id);
  const planningQuery=useWorkshopPlanningQuery(agency?.id,from,to,{technicianId:technicianFilter,bayId:bayFilter});
  const statsQuery=useWorkshopStatsQuery(agency?.id,from,to);
  const unavailabilityQuery=useWorkshopUnavailabilitiesQuery(agency?.id,from,to,technicianFilter);
  const repairOrdersQuery=useRepairOrdersQuery();
  const assignMutation=useAssignRepairOrder();
  const scheduleMutations=useWorkshopScheduleMutation();
  const absenceMutations=useWorkshopUnavailabilityMutation();
  const technicians=techniciansQuery.data??[];
  const bays=baysQuery.data??[];
  const rows=planningQuery.data??[];
  const unavailabilities=unavailabilityQuery.data??[];
  const resources:(Technician|WorkshopBay)[]=axis==='technician'?technicians:bays;
  const error=planningQuery.error||techniciansQuery.error||baysQuery.error||statsQuery.error||unavailabilityQuery.error;
  const selectedForm=selected?{technicianId:selected.technicianId,bayId:selected.bayId,startsAt:toLocalInput(selected.startsAt),endsAt:toLocalInput(selected.endsAt)}:null;
  const [editForm,setEditForm]=useState<{technicianId:string;bayId:string;startsAt:string;endsAt:string}|null>(null);
  const effectiveEdit=editForm??selectedForm;
  const days=useMemo(()=>Array.from({length:mode==='day'?1:7},(_,index)=>addDays(from,index)),[from,mode]);
  const visibleRepairOrders=(repairOrdersQuery.data??[]).filter(order=>order.agencyId===agency?.id&&!['CLOTURE','ANNULE','LIVRE'].includes(order.status));

  const rowsFor=(resource:Technician|WorkshopBay)=>rows.filter(row=>axis==='technician'?row.technicianId===resource.id:row.bayId===resource.id);
  const absencesFor=(resource:Technician|WorkshopBay)=>axis==='technician'?unavailabilities.filter(item=>item.technicianId===resource.id):[];
  const openCreate=()=>{setAssignment({...emptyAssignment(date),technicianId:technicians[0]?.id??'',bayId:bays.find(item=>item.status==='available')?.id??''});setNewOpen(true)};
  const submitCreate=async(event:React.FormEvent)=>{event.preventDefault();try{await assignMutation.mutateAsync({repairOrderId:assignment.repairOrderId,technicianId:assignment.technicianId,bayId:assignment.bayId||undefined,startsAt:toSqlDate(assignment.startsAt),endsAt:toSqlDate(assignment.endsAt)});addToast({type:'success',title:'Affectation créée',description:'Le planning atelier a été actualisé.'});setNewOpen(false)}catch(cause){addToast({type:'error',title:'Affectation impossible',description:cause instanceof Error?cause.message:'Erreur serveur'})}};
  const submitEdit=async(event:React.FormEvent)=>{event.preventDefault();if(!selected||!effectiveEdit)return;try{await scheduleMutations.update.mutateAsync({id:selected.id,agencyId:agency?.id,technicianId:effectiveEdit.technicianId,bayId:effectiveEdit.bayId||undefined,startsAt:toSqlDate(effectiveEdit.startsAt),endsAt:toSqlDate(effectiveEdit.endsAt)});addToast({type:'success',title:'Affectation modifiée',description:'Les nouvelles ressources et heures sont enregistrées.'});setSelected(null);setEditForm(null)}catch(cause){addToast({type:'error',title:'Modification impossible',description:cause instanceof Error?cause.message:'Erreur serveur'})}};
  const cancelSelected=async()=>{if(!selected||!window.confirm(`Annuler uniquement l’affectation ${selected.orderNumber} ?`))return;try{await scheduleMutations.cancel.mutateAsync({id:selected.id,agencyId:agency?.id});addToast({type:'success',title:'Affectation annulée',description:'L’ordre de réparation est conservé.'});setSelected(null);setEditForm(null)}catch(cause){addToast({type:'error',title:'Annulation impossible',description:cause instanceof Error?cause.message:'Erreur serveur'})}};
  const submitAbsence=async(event:React.FormEvent)=>{event.preventDefault();try{await absenceMutations.create.mutateAsync({technicianId:absence.technicianId,agencyId:agency?.id,reason:absence.reason,startsAt:toSqlDate(absence.startsAt),endsAt:toSqlDate(absence.endsAt)});addToast({type:'success',title:'Indisponibilité ajoutée',description:'Elle apparaît maintenant dans le planning.'});setAbsenceOpen(false)}catch(cause){addToast({type:'error',title:'Indisponibilité impossible',description:cause instanceof Error?cause.message:'Erreur serveur'})}};
  const removeAbsence=async(item:TechnicianUnavailability)=>{if(!window.confirm(`Supprimer l’indisponibilité « ${item.reason} » ?`))return;try{await absenceMutations.remove.mutateAsync({id:item.id,agencyId:agency?.id});addToast({type:'success',title:'Indisponibilité supprimée',description:'La capacité du technicien est rétablie.'})}catch(cause){addToast({type:'error',title:'Suppression impossible',description:cause instanceof Error?cause.message:'Erreur serveur'})}};

  return <div className="space-y-5">
    <PageHeader title="Planning Atelier & Ponts" subtitle={`Vue ${mode==='day'?'journalière':'hebdomadaire'} — ${from}${to!==from?` au ${to}`:''}.`} breadcrumbs={[{label:'Accueil',href:'/dashboard'},{label:'Après-Vente'},{label:'Planning Atelier'}]} actions={<div className="flex gap-2"><Button variant="outline" icon={<Clock className="w-4 h-4"/>} onClick={()=>{setAbsence({...absence,technicianId:technicians[0]?.id??''});setAbsenceOpen(true)}} disabled={!technicians.length}>Indisponibilité</Button><Button icon={<Plus className="w-4 h-4"/>} onClick={openCreate} disabled={!technicians.length||!visibleRepairOrders.length}>Nouvelle affectation</Button></div>}/>
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
      <Button size="sm" variant="ghost" aria-label="Période précédente" onClick={()=>setDate(addDays(date,mode==='day'?-1:-7))}><ChevronLeft className="w-4 h-4"/></Button>
      <CalendarDays className="w-4 h-4"/><input aria-label="Date du planning" type="date" value={date} onChange={event=>setDate(event.target.value)} className="rounded-md border border-slate-300 p-2 text-xs"/>
      <Button size="sm" variant="ghost" aria-label="Période suivante" onClick={()=>setDate(addDays(date,mode==='day'?1:7))}><ChevronRight className="w-4 h-4"/></Button>
      <div className="flex rounded-lg bg-slate-100 p-1"><button onClick={()=>setMode('day')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${mode==='day'?'bg-white shadow':''}`}>Jour</button><button onClick={()=>setMode('week')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${mode==='week'?'bg-white shadow':''}`}>Semaine</button></div>
      <div className="flex rounded-lg bg-slate-100 p-1"><button onClick={()=>setAxis('technician')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${axis==='technician'?'bg-white shadow':''}`}>Par technicien</button><button onClick={()=>setAxis('bay')} className={`px-3 py-1.5 text-xs font-semibold rounded-md ${axis==='bay'?'bg-white shadow':''}`}>Par pont</button></div>
      <select aria-label="Filtrer par technicien" value={technicianFilter} onChange={event=>setTechnicianFilter(event.target.value)} className="rounded-md border border-slate-300 p-2 text-xs"><option value="">Tous les techniciens</option>{technicians.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select aria-label="Filtrer par pont" value={bayFilter} onChange={event=>setBayFilter(event.target.value)} className="rounded-md border border-slate-300 p-2 text-xs"><option value="">Tous les ponts</option>{bays.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select>
    </div>
    {error&&<div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">Impossible de charger le planning atelier : {error instanceof Error?error.message:'Erreur API'}</div>}
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Card><CardTitle>Affectations</CardTitle><p className="mt-2 text-3xl font-bold">{statsQuery.data?.assignments??0}</p></Card>
      <Card><CardTitle>Charge planifiée</CardTitle><p className="mt-2 text-3xl font-bold">{(statsQuery.data?.scheduledHours??0).toFixed(1)} h</p></Card>
      <Card><CardTitle>Occupation techniciens</CardTitle><p className="mt-2 text-3xl font-bold">{statsQuery.data?.technicianOccupationRate??0}%</p></Card>
      <Card><CardTitle>Occupation ponts</CardTitle><p className="mt-2 text-3xl font-bold">{statsQuery.data?.bayOccupationRate??0}%</p></Card>
      <Card><CardTitle>Productivité réelle</CardTitle><p className="mt-2 text-3xl font-bold">{statsQuery.data?.productivityRate??0}%</p></Card>
    </div>
    <Card padding="none"><div className="overflow-x-auto"><div className={mode==='day'?'min-w-[1100px]':'min-w-[1450px]'}>
      <div className="grid grid-cols-[210px_1fr] border-b border-slate-200 bg-slate-50"><div className="p-3 font-semibold">{axis==='technician'?'Techniciens':'Ponts / postes'}</div>{mode==='day'?<div className="relative h-12">{HOURS.map(hour=><span key={hour} className="absolute top-3 text-[10px] text-slate-500" style={{left:`${(hour-START_HOUR)/(END_HOUR-START_HOUR)*100}%`}}>{hour}h</span>)}</div>:<div className="grid grid-cols-7">{days.map((day,index)=><div key={day} className="p-3 text-center text-xs font-semibold border-l border-slate-200">{WEEK_DAYS[index]}<small className="block font-normal text-slate-500">{new Date(`${day}T12:00:00`).toLocaleDateString('fr-CG',{day:'2-digit',month:'2-digit'})}</small></div>)}</div>}</div>
      {resources.map(resource=><div key={resource.id} className="grid grid-cols-[210px_1fr] border-b border-slate-100"><div className="p-3 bg-slate-50/60 border-r border-slate-100"><div className="flex items-center gap-2 font-semibold">{axis==='technician'?<UserRound className="w-4 h-4 text-[#8f1722]"/>:<Warehouse className="w-4 h-4 text-[#8f1722]"/>}{resource.name}</div><small className="text-slate-500">{'availableHoursPerDay' in resource?`${resource.specialty||'Généraliste'} · ${resource.availableHoursPerDay} h/j`:`${resource.bayType||'Poste atelier'} · ${resource.occupiedNow?'occupé maintenant':resource.status}`}</small></div>
        {mode==='day'?<div className="relative h-24 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px)] bg-[length:10%_100%]">{rowsFor(resource).filter(row=>row.status!=='cancelled').map(row=><button key={row.id} onClick={()=>{setSelected(row);setEditForm(null)}} style={blockStyle(row.startsAt,row.endsAt,date)} className="absolute top-3 h-16 overflow-hidden rounded-md border border-[#8f1722]/40 bg-[#8f1722] px-2 text-left text-white shadow-sm"><strong className="block truncate text-xs">{row.orderNumber}</strong><small className="block truncate">{axis==='technician'?row.bayName:row.technicianName}</small><small>{toLocalInput(row.startsAt).slice(11)}–{toLocalInput(row.endsAt).slice(11)}</small></button>)}{absencesFor(resource).map(item=><button key={`u-${item.id}`} onClick={()=>void removeAbsence(item)} style={blockStyle(item.startsAt,item.endsAt,date)} className="absolute top-3 h-16 overflow-hidden rounded-md border border-amber-400 bg-amber-100 px-2 text-left text-amber-900"><strong className="block truncate text-xs">INDISPONIBLE</strong><small className="block truncate">{item.reason}</small></button>)}</div>:<div className="grid grid-cols-7">{days.map(day=><div key={day} className="relative h-48 border-l border-slate-200 bg-[linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[length:100%_10%]">{rowsFor(resource).filter(row=>row.status!=='cancelled'&&toLocalInput(row.startsAt).slice(0,10)<=day&&toLocalInput(row.endsAt).slice(0,10)>=day).map(row=><button key={row.id} onClick={()=>{setSelected(row);setEditForm(null)}} style={verticalStyle(row.startsAt,row.endsAt,day)} className="absolute inset-x-1 overflow-hidden rounded border border-[#8f1722]/40 bg-[#8f1722] p-1 text-left text-[10px] text-white"><strong className="block truncate">{row.orderNumber}</strong><span>{toLocalInput(row.startsAt).slice(11)}–{toLocalInput(row.endsAt).slice(11)}</span></button>)}{absencesFor(resource).filter(item=>toLocalInput(item.startsAt).slice(0,10)<=day&&toLocalInput(item.endsAt).slice(0,10)>=day).map(item=><button key={`u-${item.id}`} onClick={()=>void removeAbsence(item)} style={verticalStyle(item.startsAt,item.endsAt,day)} className="absolute inset-x-1 overflow-hidden rounded border border-amber-400 bg-amber-100 p-1 text-left text-[10px] text-amber-900"><strong>INDISPONIBLE</strong><span className="block truncate">{item.reason}</span></button>)}</div>)}</div>}
      </div>)}
      {!resources.length&&!error&&<p className="p-10 text-center text-sm text-slate-500"><Wrench className="w-6 h-6 mx-auto mb-2"/>Aucune ressource atelier enregistrée dans cette agence.</p>}
    </div></div></Card>
    <div className="flex items-center gap-2 text-xs text-slate-500"><Gauge className="w-4 h-4"/>Capacité techniciens : {statsQuery.data?.capacityHours??0} h · capacité ponts : {statsQuery.data?.bayCapacityHours??0} h. L’occupation est calculée depuis le planning et les sessions.</div>

    <Modal isOpen={Boolean(selected)} onClose={()=>{setSelected(null);setEditForm(null)}} title={`Affectation ${selected?.orderNumber??''}`} description="Modifier les ressources ou annuler uniquement cette réservation de planning." maxWidth="xl">{selected&&effectiveEdit&&<form onSubmit={submitEdit} className="space-y-4"><div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm"><div><span className="text-slate-500">Client</span><strong className="block">{selected.customerName||'—'}</strong></div><div><span className="text-slate-500">Véhicule</span><strong className="block">{selected.vehicleLabel||selected.registrationNumber||'—'}</strong></div><div><span className="text-slate-500">Intervention</span><strong className="block">{selected.interventionDescription||'Non précisée'}</strong></div><div><span className="text-slate-500">Statut</span><Badge variant="primary">{statusLabel[selected.status]??selected.status}</Badge></div></div><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Technicien<select required value={effectiveEdit.technicianId} onChange={event=>setEditForm({...effectiveEdit,technicianId:event.target.value})} className="mt-1 w-full rounded-md border p-2">{technicians.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-semibold">Pont<select value={effectiveEdit.bayId} onChange={event=>setEditForm({...effectiveEdit,bayId:event.target.value})} className="mt-1 w-full rounded-md border p-2"><option value="">Sans pont</option>{bays.filter(item=>item.status==='available'||item.id===selected.bayId).map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-semibold">Début<input required type="datetime-local" value={effectiveEdit.startsAt} onChange={event=>setEditForm({...effectiveEdit,startsAt:event.target.value})} className="mt-1 w-full rounded-md border p-2"/></label><label className="text-xs font-semibold">Fin<input required type="datetime-local" value={effectiveEdit.endsAt} onChange={event=>setEditForm({...effectiveEdit,endsAt:event.target.value})} className="mt-1 w-full rounded-md border p-2"/></label></div><div className="flex flex-wrap justify-between gap-2 border-t pt-4"><Button type="button" variant="danger" loading={scheduleMutations.cancel.isPending} onClick={()=>void cancelSelected()}>Annuler l’affectation</Button><div className="flex gap-2"><Button type="button" variant="outline" icon={<ExternalLink className="w-4 h-4"/>} onClick={()=>navigate(`/service/repair-orders/${selected.repairOrderId}`)}>Consulter l’OR</Button><Button type="submit" loading={scheduleMutations.update.isPending}>Enregistrer</Button></div></div></form>}</Modal>
    <Modal isOpen={newOpen} onClose={()=>setNewOpen(false)} title="Nouvelle affectation" description="Affecter directement un ordre de réparation depuis le planning." maxWidth="xl"><form onSubmit={submitCreate} className="grid grid-cols-2 gap-4"><label className="col-span-2 text-xs font-semibold">Ordre de réparation<select required value={assignment.repairOrderId} onChange={event=>setAssignment({...assignment,repairOrderId:event.target.value})} className="mt-1 w-full rounded-md border p-2"><option value="">Sélectionner un OR…</option>{visibleRepairOrders.map(order=><option key={order.id} value={order.id}>{order.orNumber} — {order.customerName} — {order.vehicleModel}</option>)}</select></label><label className="text-xs font-semibold">Technicien<select required value={assignment.technicianId} onChange={event=>setAssignment({...assignment,technicianId:event.target.value})} className="mt-1 w-full rounded-md border p-2">{technicians.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-semibold">Pont<select value={assignment.bayId} onChange={event=>setAssignment({...assignment,bayId:event.target.value})} className="mt-1 w-full rounded-md border p-2"><option value="">Sans pont</option>{bays.filter(item=>item.status==='available').map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-xs font-semibold">Début<input required type="datetime-local" value={assignment.startsAt} onChange={event=>setAssignment({...assignment,startsAt:event.target.value})} className="mt-1 w-full rounded-md border p-2"/></label><label className="text-xs font-semibold">Fin<input required type="datetime-local" value={assignment.endsAt} onChange={event=>setAssignment({...assignment,endsAt:event.target.value})} className="mt-1 w-full rounded-md border p-2"/></label><div className="col-span-2 flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={()=>setNewOpen(false)}>Fermer</Button><Button type="submit" loading={assignMutation.isPending}>Créer l’affectation</Button></div></form></Modal>
    <Modal isOpen={absenceOpen} onClose={()=>setAbsenceOpen(false)} title="Indisponibilité technicien" description="Formation, congé, absence ou autre indisponibilité." maxWidth="lg"><form onSubmit={submitAbsence} className="space-y-4"><label className="block text-xs font-semibold">Technicien<select required value={absence.technicianId} onChange={event=>setAbsence({...absence,technicianId:event.target.value})} className="mt-1 w-full rounded-md border p-2">{technicians.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="block text-xs font-semibold">Motif<input required value={absence.reason} onChange={event=>setAbsence({...absence,reason:event.target.value})} className="mt-1 w-full rounded-md border p-2" placeholder="Formation, congé…"/></label><div className="grid grid-cols-2 gap-3"><label className="text-xs font-semibold">Début<input required type="datetime-local" value={absence.startsAt} onChange={event=>setAbsence({...absence,startsAt:event.target.value})} className="mt-1 w-full rounded-md border p-2"/></label><label className="text-xs font-semibold">Fin<input required type="datetime-local" value={absence.endsAt} onChange={event=>setAbsence({...absence,endsAt:event.target.value})} className="mt-1 w-full rounded-md border p-2"/></label></div><div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" onClick={()=>setAbsenceOpen(false)}>Fermer</Button><Button type="submit" loading={absenceMutations.create.isPending}>Enregistrer</Button></div></form></Modal>
  </div>;
};
