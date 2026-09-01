import React, { useEffect, useMemo, useState } from 'react';
import { useCreateRepairOrder, useCustomersQuery, useTechniciansQuery, useVehiclesQuery } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';

interface NewRepairOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewRepairOrderModal: React.FC<NewRepairOrderModalProps> = ({ isOpen, onClose }) => {
  const customersQuery = useCustomersQuery();
  const vehiclesQuery = useVehiclesQuery();
  const techniciansQuery = useTechniciansQuery();
  const customers = customersQuery.data ?? [];
  const vehicles = vehiclesQuery.data ?? [];
  const technicians = useMemo(() => (techniciansQuery.data ?? []).map((technician: any) => ({ id: String(technician.id), name: technician.name, specialty: technician.specialty ?? '' })), [techniciansQuery.data]);
  const createRepairOrder=useCreateRepairOrder();
  const { currentUser, currentAgency } = useAuthStore();
  const { addToast } = useUiStore();

  const [formData, setFormData] = useState({
    customerId: customers[0]?.id || '',
    customerName: '',
    customerPhone: customers[0]?.phone || '',
    vehicleId: vehicles[0]?.id || '',
    vehicleModel: 'Peugeot 3008 GT Hybrid',
    vehiclePlate: 'FR-392-XX',
    vehicleVin: 'VR3FPHNSSMY551829',
    mileage: 42000,
    technicianId: technicians[0]?.id || '',
    bayNumber: 'Pont 02 - Entretien & Freinage',
    appointmentDate: new Date().toISOString().slice(0, 16).replace('T', ' '),
    promisedCompletionDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16).replace('T', ' '),
    symptomsReported: 'Révision annuelle des 45 000 km + contrôle bruit train avant.',
    diagnosticNotes: 'Contrôle visuel plaquettes et vidange huile moteur 5W30.',
    warrantyCovered: false,
    courtesyCarAssigned: 'Renault Clio Démo',
  });
  const firstCustomer = customers[0];
  const firstVehicleId = vehicles[0]?.id ?? '';
  const firstTechnicianId = technicians[0]?.id ?? '';
  useEffect(() => {
    if (!isOpen) return;
    setFormData((current) => {
      const customerId = current.customerId || firstCustomer?.id || '';
      const customerName = current.customerName || (firstCustomer ? `${firstCustomer.firstName} ${firstCustomer.lastName}`.trim() : '');
      const vehicleId = current.vehicleId || firstVehicleId;
      const technicianId = current.technicianId || firstTechnicianId;
      if (customerId === current.customerId && customerName === current.customerName && vehicleId === current.vehicleId && technicianId === current.technicianId) return current;
      return { ...current, customerId, customerName, vehicleId, technicianId };
    });
  }, [isOpen, firstCustomer?.id, firstCustomer?.firstName, firstCustomer?.lastName, firstVehicleId, firstTechnicianId]);

  const handleCustomerChange = (custId: string) => {
    const cust = customers.find((c) => c.id === custId);
    if (cust) {
      setFormData({
        ...formData,
        customerId: cust.id,
        customerName: `${cust.civility} ${cust.firstName} ${cust.lastName}`,
        customerPhone: cust.phone,
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const vehicle=vehicles.find(v=>v.id===formData.vehicleId); if(!vehicle){addToast({type:'error',title:'Véhicule requis',description:'Sélectionnez explicitement un véhicule existant.'});return;}
    try{await createRepairOrder.mutateAsync({
      customerId: formData.customerId,
      vehicleId: vehicle.id,
      mileage: formData.mileage,
      advisorId: currentUser?.id,
      agencyId: currentAgency?.id,
      complaint: formData.symptomsReported,
      diagnosisSummary: formData.diagnosticNotes,
    });

    addToast({
      type: 'success',
      title: 'Ordre de Réparation créé (OR)',
      description: `L’OR a été ouvert pour ${formData.customerName} (${formData.vehiclePlate}).`,
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
        {/* Customer Select */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Client *</label>
          <select
            value={formData.customerId}
            onChange={(e) => handleCustomerChange(e.target.value)}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.civility} {c.firstName} {c.lastName} ({c.code}) - {c.phone}
              </option>
            ))}
          </select>
        </div>

        {/* Vehicle Info */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Véhicule existant *</label>
            <select required value={formData.vehicleId} onChange={e=>setFormData({...formData,vehicleId:e.target.value})} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"><option value="">Sélectionner…</option>{vehicles.map(v=><option key={v.id} value={v.id}>{v.brand} {v.model} {v.version} — {v.registrationNumber||v.vin}</option>)}</select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kilométrage actuel</label>
            <input
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Tech & Bay */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Technicien assigné</label>
            <select
              value={formData.technicianId}
              onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialty})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pont / Emplacement</label>
            <input
              type="text"
              value={formData.bayNumber}
              onChange={(e) => setFormData({ ...formData, bayNumber: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
            />
          </div>
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

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit">
            Ouvrir l'Ordre de Réparation
          </Button>
        </div>
      </form>
    </Modal>
  );
};
