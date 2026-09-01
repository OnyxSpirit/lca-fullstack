import React, { useState } from 'react';
import { useCreateVehicle } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { FuelType, TransmissionType, VehicleStatus } from '../../types';

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewVehicleModal: React.FC<NewVehicleModalProps> = ({ isOpen, onClose }) => {
  const createVehicle = useCreateVehicle();
  const { currentAgency } = useAuthStore();
  const { addToast } = useUiStore();

  const [formData, setFormData] = useState({
    vin: '',
    registrationNumber: '',
    brand: 'BMW',
    model: '',
    version: '',
    type: 'Occasion' as 'Neuf' | 'Occasion' | 'Démo',
    bodyType: 'SUV' as 'Berline' | 'SUV' | 'Break' | 'Coupé' | 'Citadine' | 'Utilitaire',
    year: 2024,
    firstRegistrationDate: '2024-03-15',
    mileage: 18500,
    color: 'Gris Minéral Métallisé',
    interiorColor: 'Cuir Noir',
    fuel: 'Hybride Rechargeable' as FuelType,
    transmission: 'Automatique' as TransmissionType,
    fiscalPower: 8,
    realPower: 225,
    co2Emissions: 42,
    status: 'DISPONIBLE' as VehicleStatus,
    location: 'Parc Extérieur',
    stockDays: 1,
    purchasePriceHT: 28000,
    refurbishCostHT: 600,
    otherCostsHT: 250,
    catalogPriceTTC: 49500,
    sellingPriceTTC: 39900,
    minimumPriceTTC: 38500,
    targetMarginHT: 3500,
    supplier: 'Reprise Concessionnaire',
    photos: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=900&auto=format&fit=crop&q=80'],
    features: ['GPS Navigation Pro', 'Caméra de recul', 'Sièges chauffants', 'Régulateur adaptatif'],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.brand || !formData.model || !formData.vin) {
      addToast({
        type: 'error',
        title: 'Champs manquants',
        description: 'Veuillez saisir au minimum la marque, le modèle et le numéro VIN.',
      });
      return;
    }

    try {
      await createVehicle.mutateAsync({vin:formData.vin,registrationNumber:formData.registrationNumber||undefined,brand:formData.brand,model:formData.model,version:formData.version,agencyId:currentAgency?.id,year:formData.year,color:formData.color,fuelType:formData.fuel,transmission:formData.transmission,mileage:formData.mileage,purchasePrice:formData.purchasePriceHT,additionalCosts:formData.refurbishCostHT+formData.otherCostsHT,catalogPrice:formData.catalogPriceTTC,salePrice:formData.sellingPriceTTC});
      addToast({ type: 'success', title: 'Véhicule ajouté au stock', description: `${formData.brand} ${formData.model} a été enregistré dans le parc.` });
      onClose();
    } catch (error) {
      addToast({ type: 'error', title: 'Ajout impossible', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Entrée en stock d'un véhicule (VN / VO)"
      description="Renseignez l'identification, la mécanique, les coûts et le prix de vente."
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type de véhicule</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Neuf">Véhicule Neuf (VN)</option>
              <option value="Occasion">Véhicule d'Occasion (VO)</option>
              <option value="Démo">Véhicule de Démonstration</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Marque *</label>
            <input
              type="text"
              required
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="ex: BMW, Audi, Peugeot..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Modèle *</label>
            <input
              type="text"
              required
              value={formData.model}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              placeholder="ex: X3, 3008, Q5..."
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">Version & Finition</label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="ex: xDrive30e M Sport 292ch BVA8"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Carrosserie</label>
            <select
              value={formData.bodyType}
              onChange={(e) => setFormData({ ...formData, bodyType: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="SUV">SUV</option>
              <option value="Berline">Berline</option>
              <option value="Break">Break</option>
              <option value="Coupé">Coupé</option>
              <option value="Citadine">Citadine</option>
              <option value="Utilitaire">Utilitaire</option>
            </select>
          </div>
        </div>

        {/* Row 3: VIN & Plate & Fuel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Numéro VIN (17 car.) *</label>
            <input
              type="text"
              required
              maxLength={17}
              value={formData.vin}
              onChange={(e) => setFormData({ ...formData, vin: e.target.value.toUpperCase() })}
              placeholder="ex: WBA31AY00P0987123"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Immatriculation</label>
            <input
              type="text"
              value={formData.registrationNumber}
              onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value.toUpperCase() })}
              placeholder="ex: GH-450-LK"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white uppercase font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Énergie</label>
            <select
              value={formData.fuel}
              onChange={(e) => setFormData({ ...formData, fuel: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Hybride Rechargeable">Hybride Rechargeable</option>
              <option value="Électrique">Électrique</option>
              <option value="Hybride">Hybride</option>
              <option value="Essence">Essence</option>
              <option value="Diesel">Diesel</option>
            </select>
          </div>
        </div>

        {/* Row 4: Mileage & Year & Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Kilométrage</label>
            <input
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData({ ...formData, mileage: Number(e.target.value) })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Année</label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Couleur Extérieure</label>
            <input
              type="text"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transmission</label>
            <select
              value={formData.transmission}
              onChange={(e) => setFormData({ ...formData, transmission: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="Automatique">Automatique</option>
              <option value="Manuelle">Manuelle</option>
              <option value="Double Débrayage">Double Débrayage</option>
            </select>
          </div>
        </div>

        {/* Row 5: Financials & Margins */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
            Données Financières & Marge Cible
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Prix Achat HT (FCFA)</label>
              <input
                type="number"
                value={formData.purchasePriceHT}
                onChange={(e) => setFormData({ ...formData, purchasePriceHT: Number(e.target.value) })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Frais remise en état HT</label>
              <input
                type="number"
                value={formData.refurbishCostHT}
                onChange={(e) => setFormData({ ...formData, refurbishCostHT: Number(e.target.value) })}
                className="w-full text-xs p-2 rounded-lg border border-slate-300 bg-white focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Prix Vente TTC (FCFA)</label>
              <input
                type="number"
                value={formData.sellingPriceTTC}
                onChange={(e) => setFormData({ ...formData, sellingPriceTTC: Number(e.target.value) })}
                className="w-full text-xs p-2 rounded-lg border border-blue-400 bg-white font-bold text-blue-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">Marge Cible HT (FCFA)</label>
              <input
                type="number"
                value={formData.targetMarginHT}
                onChange={(e) => setFormData({ ...formData, targetMarginHT: Number(e.target.value) })}
                className="w-full text-xs p-2 rounded-lg border border-emerald-400 bg-white font-bold text-emerald-700 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit">
            Enregistrer le véhicule en stock
          </Button>
        </div>
      </form>
    </Modal>
  );
};
