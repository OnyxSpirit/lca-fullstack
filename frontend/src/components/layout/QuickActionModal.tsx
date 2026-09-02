import React, { useState } from 'react';
import {
  UserPlus,
  Car,
  BadgePercent,
  Wrench,
  Truck,
  Receipt,
  PackagePlus,
  Compass,
  ArrowRight,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../ui/Modal';
import { NewLeadModal } from '../../modules/crm/NewLeadModal';
import { NewVehicleModal } from '../../modules/vehicles/NewVehicleModal';
import { NewRepairOrderModal } from '../../modules/service/NewRepairOrderModal';
import { SaleWizardModal } from '../../modules/sales/SaleWizardModal';
import { NewInvoiceModal } from '../../modules/billing/NewInvoiceModal';
import { NewDeliveryModal } from '../../modules/deliveries/NewDeliveryModal';

export const QuickActionModal: React.FC = () => {
  const { activeQuickActionModal, quickActionContext, setActiveQuickActionModal } = useUiStore();

  const actions = [
    {
      id: 'lead',
      title: 'Nouveau Prospect (CRM)',
      desc: 'Enregistrer une opportunité, budget et véhicule recherché.',
      icon: <UserPlus className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-50 hover:bg-blue-100/80 border-blue-200',
    },
    {
      id: 'vehicle',
      title: 'Entrée Stock Véhicule (VN/VO)',
      desc: 'Ajouter un véhicule en stock avec VIN, prix et options.',
      icon: <Car className="w-5 h-5 text-emerald-600" />,
      color: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200',
    },
    {
      id: 'sale',
      title: 'Créer une Vente Automobile',
      desc: 'Assistant complet : reprise, financement, remise et bon de commande.',
      icon: <BadgePercent className="w-5 h-5 text-indigo-600" />,
      color: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200',
    },
    {
      id: 'or',
      title: 'Créer un Ordre de Réparation (OR)',
      desc: 'Ouverture dossier atelier SAV, diagnostic et assignation mécanicien.',
      icon: <Wrench className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200',
    },
    {
      id: 'delivery',
      title: 'Planifier une Livraison',
      desc: 'Planifier le créneau de mise en main client et la checklist qualité.',
      icon: <Truck className="w-5 h-5 text-teal-600" />,
      color: 'bg-teal-50 hover:bg-teal-100/80 border-teal-200',
    },
    {
      id: 'invoice',
      title: 'Émettre une Facture',
      desc: 'Facture vente véhicule, atelier SAV ou comptoir pièces de rechange.',
      icon: <Receipt className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-50 hover:bg-purple-100/80 border-purple-200',
    },
  ];

  const handleActionClick = (actionId: string) => {
    setActiveQuickActionModal(actionId);
  };

  return (
    <>
      {/* Quick Actions Hub Menu */}
      <Modal
        isOpen={activeQuickActionModal === 'menu'}
        onClose={() => setActiveQuickActionModal(null)}
        title="Création rapide d'une opération"
        description="Choisissez l'action métier que vous souhaitez initier immédiatement."
        maxWidth="xl"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((act) => (
            <button
              key={act.id}
              onClick={() => handleActionClick(act.id)}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 group cursor-pointer ${act.color}`}
            >
              <div className="p-2.5 rounded-lg bg-white shadow-xs shrink-0">
                {act.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 group-hover:text-blue-700">
                    {act.title}
                  </h4>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">{act.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Sub Modals */}
      <NewLeadModal
        isOpen={activeQuickActionModal === 'lead'}
        onClose={() => setActiveQuickActionModal(null)}
      />
      <NewVehicleModal
        isOpen={activeQuickActionModal === 'vehicle'}
        onClose={() => setActiveQuickActionModal(null)}
      />
      <SaleWizardModal
        isOpen={activeQuickActionModal === 'sale'}
        onClose={() => setActiveQuickActionModal(null)}
        initialCustomerId={quickActionContext?.customerId}
        initialVehicleId={quickActionContext?.vehicleId}
      />
      <NewRepairOrderModal
        isOpen={activeQuickActionModal === 'or'}
        onClose={() => setActiveQuickActionModal(null)}
        initialCustomerId={quickActionContext?.customerId}
        initialVehicleId={quickActionContext?.vehicleId}
      />
      <NewInvoiceModal
        isOpen={activeQuickActionModal === 'invoice'}
        onClose={() => setActiveQuickActionModal(null)}
      />
      <NewDeliveryModal isOpen={activeQuickActionModal === 'delivery'} onClose={() => setActiveQuickActionModal(null)} />
    </>
  );
};
