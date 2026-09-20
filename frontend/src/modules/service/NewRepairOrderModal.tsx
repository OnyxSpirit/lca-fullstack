import React, { useEffect, useState } from 'react';
import { useAdvisorCandidatesQuery, useCreateRepairOrder, useCustomerServiceVehiclesQuery, useRepairOrderCustomersQuery } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { selectCustomerVehicle } from './repairOrderVehicleSelection';

interface NewRepairOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialVehicleId?: string;
}

export const NewRepairOrderModal: React.FC<NewRepairOrderModalProps> = ({ isOpen, onClose, initialCustomerId, initialVehicleId }) => {
  const { currentUser, currentAgency, can } = useAuthStore();
  const customersQuery = useRepairOrderCustomersQuery(currentUser?.id,isOpen);
  const customers=customersQuery.data??[];
  const createRepairOrder=useCreateRepairOrder();
  const canAssignAdvisor=can('service.order.assign_advisor');
  const [advisorId,setAdvisorId]=useState('');
  const { addToast } = useUiStore();
  const freshForm=()=>({customerId:'',customerName:'',customerPhone:'',vehicleId:'',mileage:0,promisedCompletionDate:new Date(Date.now()+86400000).toISOString().slice(0,16).replace('T',' '),symptomsReported:'',diagnosticNotes:'',warrantyCovered:false,warrantyReference:''});
  const [formData,setFormData]=useState(freshForm);
  const selectedCustomer=customers.find(customer=>customer.id===formData.customerId);
  const advisorsQuery=useAdvisorCandidatesQuery(selectedCustomer?.agencyId??currentAgency?.id,isOpen);
  const advisors=advisorsQuery.data??[];
  const customerVehiclesQuery=useCustomerServiceVehiclesQuery(formData.customerId,isOpen);
  const vehicles=customerVehiclesQuery.data??[];
  useEffect(()=>{if(!isOpen){setFormData(freshForm());setAdvisorId('');return}if(!customersQuery.isSuccess)return;const customer=customers.find(c=>c.id===initialCustomerId);setFormData(freshForm());if(customer)setFormData(current=>({...current,customerId:customer.id,customerName:`${customer.firstName} ${customer.lastName}`.trim(),customerPhone:customer.phone}));},[isOpen,initialCustomerId,customersQuery.isSuccess]);
  useEffect(()=>{if(!isOpen)return;setAdvisorId(advisors.some(user=>user.id===currentUser?.id)?currentUser!.id:advisors[0]?.id??'')},[isOpen,advisorsQuery.data,currentUser?.id]);
  useEffect(()=>{if(!isOpen||!customerVehiclesQuery.isSuccess)return;setFormData(current=>({...current,vehicleId:selectCustomerVehicle(vehicles.map(v=>v.id),initialVehicleId)}))},[isOpen,formData.customerId,customerVehiclesQuery.data,initialVehicleId]);
  const handleCustomerChange=(custId:string)=>{const cust=customers.find(c=>c.id===custId);setFormData(current=>({...current,customerId:custId,customerName:cust?`${cust.civility} ${cust.firstName} ${cust.lastName}`:'',customerPhone:cust?.phone??'',vehicleId:''}));};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!Number.isFinite(formData.mileage)||!Number.isInteger(formData.mileage)||formData.mileage<0){addToast({type:'error',title:'Kilométrage invalide',description:'Le kilométrage doit être un nombre entier positif ou nul.'});return;}
    const vehicle=vehicles.find(v=>v.id===formData.vehicleId); if(!vehicle){addToast({type:'error',title:'Véhicule requis',description:'Sélectionnez explicitement un véhicule existant.'});return;}
    if(!advisors.some(user=>user.id===advisorId)){addToast({type:'error',title:'Conseiller SAV requis',description:'Aucun conseiller opérationnel éligible n’est disponible dans cette agence.'});return;}
    try{await createRepairOrder.mutateAsync({
      customerId: formData.customerId,
      vehicleId: vehicle.id,
      mileage: formData.mileage,
      advisorId,
      complaint: formData.symptomsReported,
      diagnosisSummary: formData.diagnosticNotes,
      warrantyCovered: formData.warrantyCovered,
      warrantyReference: formData.warrantyCovered?formData.warrantyReference:undefined,
      promisedCompletionAt: formData.promisedCompletionDate,
    });

    addToast({
      type: 'success',
      title: 'Ordre de Réparation créé (OR)',
      description: `L’OR a été ouvert pour ${formData.customerName} (${vehicle.registrationNumber || vehicle.vin}).`,
    });

    onClose();}catch(error){addToast({type:'error',title:'Création impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Créer un Ordre de Réparation Atelier (OR)"
      description="Ouverture de dossier SAV et planification d'intervention atelier."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {canAssignAdvisor?<label className="block text-xs font-semibold text-slate-700">Conseiller SAV affecté<select required value={advisorId} onChange={event=>setAdvisorId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white p-2.5"><option value="">Sélectionner…</option>{advisors.map(user=><option key={user.id} value={user.id}>{user.name}</option>)}</select></label>:<p className="text-xs text-slate-600">Conseiller SAV : {advisors.find(user=>user.id===advisorId)?.name??'Aucun conseiller éligible'}</p>}
        {advisorsQuery.isError&&<p className="text-xs text-red-700">Chargement des conseillers impossible : {advisorsQuery.error.message}</p>}
        {/* Customer Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Client *</label>
          <select
            value={formData.customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
          >
            <option value="">Sélectionner un client…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.civility} {c.firstName} {c.lastName} ({c.code}) - {c.phone}
              </option>
            ))}
          </select>
        </div>
        {customersQuery.isError&&<p className="text-xs text-red-700">Chargement des clients impossible : {customersQuery.error.message}</p>}

        {/* Vehicle Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Véhicule existant *</label>
          <select required value={formData.vehicleId} onChange={e=>setFormData({...formData,vehicleId:e.target.value})} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"><option value="">Sélectionner…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.label} — {v.registrationNumber||v.vin}</option>)}</select>
            {formData.customerId&&customerVehiclesQuery.isSuccess&&!vehicles.length&&<p className="text-[11px] text-amber-700 mt-1">Aucun véhicule enregistré pour ce client</p>}
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kilométrage actuel</label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Fin promise</label>
          <input type="datetime-local" value={formData.promisedCompletionDate.replace(' ', 'T')} onChange={(e)=>setFormData({...formData,promisedCompletionDate:e.target.value.replace('T',' ')})} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none" />
        </div>

        {/* Symptoms */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Motif de visite & Symptômes signalés par le client *
          </label>
          <textarea
            rows={2}
            required
            value={formData.symptomsReported}
            onChange={(e) => setFormData({ ...formData, symptomsReported: e.target.value })}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
          />
        </div>

        {/* Options */}
        <div className="flex flex-wrap gap-4 pt-1">
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.warrantyCovered}
              onChange={(e) => setFormData({ ...formData, warrantyCovered: e.target.checked })}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            Prise en charge sous Garantie Constructeur
          </label>
        </div>
        {formData.warrantyCovered&&<div><label className="block text-xs font-semibold text-slate-700 mb-1">Référence de garantie *</label><input required value={formData.warrantyReference} onChange={e=>setFormData({...formData,warrantyReference:e.target.value})} className="w-full text-xs p-2.5 rounded-lg border border-slate-300" /></div>}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" disabled={customerVehiclesQuery.isFetching||advisorsQuery.isFetching||!formData.vehicleId||!formData.customerId||!advisors.some(user=>user.id===advisorId)}>
            Ouvrir l'Ordre de Réparation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
