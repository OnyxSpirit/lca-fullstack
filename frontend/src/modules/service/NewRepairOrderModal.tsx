import React, { useEffect, useState } from 'react';
import { useAdvisorCandidatesQuery, useCreateRepairOrder, useCustomerServiceVehiclesQuery, useRepairOrderCustomersQuery, useVehicleWarrantyEligibilityQuery } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { selectCustomerVehicle } from './repairOrderVehicleSelection';
import{formatDate}from'../../lib/utils';

interface NewRepairOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialVehicleId?: string;
}

const eligibilityLabel={NO_CONTRACT:'Aucun contrat historique',UNDETERMINED:'Situation de garantie à régulariser',NOT_COVERED:'Garantie non applicable',PENDING_ACTIVATION:'Garantie prévue — en attente d’activation à la livraison',EXPIRED_BY_DATE:'Garantie expirée par date',MILEAGE_REQUIRED:'Vérification kilométrique requise',EXPIRED_BY_MILEAGE:'Limite kilométrique dépassée',ELIGIBLE_CONTRACTUALLY:'Garantie active'} as const;
const contractStatusLabel:Record<string,string>={PENDING_DECISION:'Décision à prendre',NOT_APPLICABLE:'Non applicable',PENDING_ACTIVATION:'En attente d’activation',ACTIVE:'Actif'};
const shownDate=(value:string|null)=>value?formatDate(value):'Non renseignée';

export const NewRepairOrderModal: React.FC<NewRepairOrderModalProps> = ({ isOpen, onClose, initialCustomerId, initialVehicleId }) => {
  const { currentUser, currentAgency, can } = useAuthStore();
  const customersQuery = useRepairOrderCustomersQuery(currentUser?.id,isOpen);
  const customers=customersQuery.data??[];
  const createRepairOrder=useCreateRepairOrder();
  const canAssignAdvisor=can('service.order.assign_advisor');
  const [advisorId,setAdvisorId]=useState('');
  const { addToast } = useUiStore();
  const freshForm=()=>({customerId:'',customerName:'',customerPhone:'',vehicleId:'',mileage:'',promisedCompletionDate:new Date(Date.now()+86400000).toISOString().slice(0,16).replace('T',' '),symptomsReported:'',diagnosticNotes:''});
  const [formData,setFormData]=useState(freshForm);
  const selectedCustomer=customers.find(customer=>customer.id===formData.customerId);
  const advisorsQuery=useAdvisorCandidatesQuery(selectedCustomer?.agencyId??currentAgency?.id,isOpen);
  const advisors=advisorsQuery.data??[];
  const customerVehiclesQuery=useCustomerServiceVehiclesQuery(formData.customerId,isOpen);
  const vehicles=customerVehiclesQuery.data??[];
  const parsedMileage=formData.mileage!==''&&Number.isInteger(Number(formData.mileage))&&Number(formData.mileage)>=0?Number(formData.mileage):null,warrantyQuery=useVehicleWarrantyEligibilityQuery(formData.vehicleId,parsedMileage,isOpen),vehicleWarranty=warrantyQuery.data;
  useEffect(()=>{if(!isOpen){setFormData(freshForm());setAdvisorId('');return}if(!customersQuery.isSuccess)return;const customer=customers.find(c=>c.id===initialCustomerId);setFormData(freshForm());if(customer)setFormData(current=>({...current,customerId:customer.id,customerName:`${customer.firstName} ${customer.lastName}`.trim(),customerPhone:customer.phone}));},[isOpen,initialCustomerId,customersQuery.isSuccess]);
  useEffect(()=>{if(!isOpen)return;setAdvisorId(advisors.some(user=>user.id===currentUser?.id)?currentUser!.id:advisors[0]?.id??'')},[isOpen,advisorsQuery.data,currentUser?.id]);
  useEffect(()=>{if(!isOpen||!customerVehiclesQuery.isSuccess)return;setFormData(current=>({...current,vehicleId:selectCustomerVehicle(vehicles.map(v=>v.id),initialVehicleId)}))},[isOpen,formData.customerId,customerVehiclesQuery.data,initialVehicleId]);
  const handleCustomerChange=(custId:string)=>{const cust=customers.find(c=>c.id===custId);setFormData(current=>({...current,customerId:custId,customerName:cust?`${cust.civility} ${cust.firstName} ${cust.lastName}`:'',customerPhone:cust?.phone??'',vehicleId:''}));};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const mileage=Number(formData.mileage);if(formData.mileage===''||!Number.isFinite(mileage)||!Number.isInteger(mileage)||mileage<0){addToast({type:'error',title:'Kilométrage invalide',description:'Le kilométrage doit être un nombre entier positif ou nul.'});return;}
    const vehicle=vehicles.find(v=>v.id===formData.vehicleId); if(!vehicle){addToast({type:'error',title:'Véhicule requis',description:'Sélectionnez explicitement un véhicule existant.'});return;}
    if(!advisors.some(user=>user.id===advisorId)){addToast({type:'error',title:'Conseiller SAV requis',description:'Aucun conseiller opérationnel éligible n’est disponible dans cette agence.'});return;}
    try{await createRepairOrder.mutateAsync({
      customerId: formData.customerId,
      vehicleId: vehicle.id,
      mileage,
      advisorId,
      complaint: formData.symptomsReported,
      diagnosisSummary: formData.diagnosticNotes,
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
              onChange={(e) => setFormData({ ...formData, mileage: e.target.value })}
              placeholder="Saisir le kilométrage"
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

        {formData.vehicleId&&<div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1"><p className="font-bold text-slate-900">Garantie constructeur</p>{warrantyQuery.isLoading||warrantyQuery.isFetching&&!vehicleWarranty?<p>Vérification du contrat…</p>:warrantyQuery.isError?<p className="text-red-700">Impossible de récupérer le contexte Garantie. Réessayez ou contactez un administrateur.</p>:!vehicleWarranty?<p className="text-red-700">Contexte Garantie indisponible.</p>:vehicleWarranty.status==='NO_CONTRACT'?<p className="text-slate-700">Aucune garantie constructeur applicable à ce véhicule.</p>:<><p>Éligibilité actuelle : <b>{eligibilityLabel[vehicleWarranty.status]}</b></p>{vehicleWarranty.contract&&<div className="grid gap-x-4 gap-y-1 sm:grid-cols-2"><p>Constructeur : <b>{vehicleWarranty.contract.providerName??'Non renseigné'}</b></p><p>Code constructeur : <b>{vehicleWarranty.contract.providerCode??'Non renseigné'}</b></p><p>Statut contractuel : <b>{contractStatusLabel[vehicleWarranty.contract.status]??vehicleWarranty.contract.status}</b></p><p>Durée contractuelle : <b>{vehicleWarranty.contract.durationMonths==null?'Non renseignée':`${vehicleWarranty.contract.durationMonths} mois`}</b></p><p>Date d’activation : <b>{shownDate(vehicleWarranty.contract.activatedAt)}</b></p><p>Date de début : <b>{shownDate(vehicleWarranty.contract.startDate)}</b></p><p>Date d’échéance : <b>{shownDate(vehicleWarranty.contract.expiryDate)}</b></p><p>Limite kilométrique : <b>{vehicleWarranty.contract.mileageLimit==null?'Non renseignée':`${vehicleWarranty.contract.mileageLimit.toLocaleString('fr-FR')} km`}</b></p><p>Kilométrage de référence : <b>{vehicleWarranty.contract.initialMileage==null?'Non renseigné':`${vehicleWarranty.contract.initialMileage.toLocaleString('fr-FR')} km`}</b></p><p>Kilométrage de réception : <b>{vehicleWarranty.currentMileage==null?'À déterminer':`${vehicleWarranty.currentMileage.toLocaleString('fr-FR')} km`}</b></p></div>}{vehicleWarranty.status==='ELIGIBLE_CONTRACTUALLY'&&<p className="text-slate-600">Ce véhicule possède une garantie constructeur active. La prise en charge de cette intervention reste soumise à validation.</p>}</>}</div>}

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
