import React, { useState } from 'react';
import { useCreateLead } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { LeadStage } from '../../types';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose }) => {
  const createLead = useCreateLead();
  const { currentUser, currentAgency } = useAuthStore();
  const { addToast } = useUiStore();

  const [formData, setFormData] = useState({
    civility: 'M.' as 'M.' | 'Mme' | 'Société',
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    source: 'Passage Showroom' as const,
    stage: 'NOUVEAU' as LeadStage,
    targetVehicle: '',
    targetBudget: 35000,
    priority: 'Haute' as const,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.lastName || !formData.phone) {
      addToast({
        type: 'error',
        title: 'Champs requis manquants',
        description: 'Veuillez saisir au minimum le nom et le numéro de téléphone.',
      });
      return;
    }

    try {
      const priorityToDb={Basse:'low',Moyenne:'medium',Haute:'high',Urgente:'urgent'} as const;
      await createLead.mutateAsync({ firstName: formData.firstName, lastName: formData.lastName, companyName: formData.company || undefined, email: formData.email || undefined, phone: formData.phone, source: formData.source, assignedUserId: currentUser?.id, title: formData.targetVehicle || 'Opportunité véhicule', expectedValue: formData.targetBudget, probability: 75, priority:priorityToDb[formData.priority], notes: formData.notes });
      addToast({ type: 'success', title: 'Prospect créé avec succès', description: `${formData.firstName} ${formData.lastName} a été ajouté au pipeline CRM.` });
      onClose();
    } catch (error) {
      addToast({ type: 'error', title: 'Création impossible', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouveau Prospect / Opportunité CRM"
      description="Enregistrez les coordonnées et les souhaits d'achat du prospect."
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Civilité</label>
            <select
              value={formData.civility}
              onChange={(e) => setFormData({ ...formData, civility: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
              <option value="Société">Société</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
            <input
              type="text"
              required
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="Prénom"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
            <input
              type="text"
              required
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="ex: Dupont"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone *</label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="ex: 06 12 34 56 78"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="ex: alexandre.dupont@email.fr"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Source contact</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Passage Showroom">Passage Showroom</option>
              <option value="Web">Formulaire Web</option>
              <option value="Téléphone">Appel Téléphonique</option>
              <option value="LeBonCoin">LeBonCoin / LaCentrale</option>
              <option value="Parrainage">Parrainage Client</option>
              <option value="Campagne Marketing">Campagne Marketing</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Priorité</label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Basse">Basse</option>
              <option value="Moyenne">Moyenne</option>
              <option value="Haute">Haute</option>
              <option value="Urgente">Urgente 🔥</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Étape Initiale</label>
            <select
              value={formData.stage}
              onChange={(e) => setFormData({ ...formData, stage: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="NOUVEAU">Nouveau</option>
              <option value="CONTACTE">Contacté</option>
              <option value="QUALIFIE">Qualifié</option>
              <option value="RDV">Rendez-vous fixé</option>
              <option value="ESSAI">Essai routier</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Véhicule recherché / Marque & Modèle</label>
            <input
              type="text"
              value={formData.targetVehicle}
              onChange={(e) => setFormData({ ...formData, targetVehicle: e.target.value })}
              placeholder="ex: BMW Série 3 Hybride / Audi Q5"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Budget cible (FCFA TTC)</label>
            <input
              type="number"
              step="1000"
              value={formData.targetBudget}
              onChange={(e) => setFormData({ ...formData, targetBudget: Number(e.target.value) })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes & Attentes du client</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Détails du projet d'achat, véhicule actuel à reprendre, date souhaitée..."
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit">
            Enregistrer le prospect
          </Button>
        </div>
      </form>
    </Modal>
  );
};
