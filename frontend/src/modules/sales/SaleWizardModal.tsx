import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  User,
  Car,
  Tag,
  ShieldAlert,
  CreditCard,
  FileCheck2,
  Plus,
} from 'lucide-react';
import { useCreateSale, useCustomersQuery, useVehiclesQuery } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { formatCurrency } from '../../lib/utils';
import { Badge } from '../../components/ui/Badge';

interface SaleWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialVehicleId?: string;
}

export const SaleWizardModal: React.FC<SaleWizardModalProps> = ({ isOpen, onClose, initialCustomerId, initialVehicleId }) => {
  const customers=useCustomersQuery().data??[],vehicles=useVehiclesQuery().data??[]; const createSale=useCreateSale();
  const { currentUser, currentAgency } = useAuthStore();
  const { addToast } = useUiStore();

  const [step, setStep] = useState<number>(1);

  // Wizard state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || '');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles.find((v) => v.status === 'DISPONIBLE')?.id || '');
  const [discountTTC, setDiscountTTC] = useState<number>(1000);
  const [optionsTotalTTC, setOptionsTotalTTC] = useState<number>(800);
  const [hasTradeIn, setHasTradeIn] = useState<boolean>(true);
  const [tradeInDetails, setTradeInDetails] = useState<string>('Peugeot 308 II 1.2 PureTech 2018 - 74 000 km');
  const [tradeInValueTTC, setTradeInValueTTC] = useState<number>(8500);
  const [registrationFeesTTC, setRegistrationFeesTTC] = useState<number>(420);
  const [administrativeFeesTTC, setAdministrativeFeesTTC] = useState<number>(290);
  const [depositPaidTTC, setDepositPaidTTC] = useState<number>(4000);
  const [financingType, setFinancingType] = useState<'Comptant' | 'LOA' | 'LLD' | 'Crédit Classique'>('LOA');
  const [durationMonths, setDurationMonths] = useState<number>(48);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>('2026-09-05');
  const [notes, setNotes] = useState<string>('Pack livraison confort + gravage vitres offert');

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  useEffect(() => { if (!selectedCustomerId && customers[0]) setSelectedCustomerId(customers[0].id); }, [customers, selectedCustomerId]);
  useEffect(()=>{if(isOpen&&initialCustomerId&&customers.some(c=>c.id===initialCustomerId))setSelectedCustomerId(initialCustomerId)},[isOpen,initialCustomerId,customers]);
  useEffect(()=>{if(isOpen&&initialVehicleId&&vehicles.some(v=>v.id===initialVehicleId&&v.status==='DISPONIBLE'))setSelectedVehicleId(initialVehicleId)},[isOpen,initialVehicleId,vehicles]);
  useEffect(() => { if (!selectedVehicleId) { const available = vehicles.find(v => v.status === 'DISPONIBLE'); if (available) setSelectedVehicleId(available.id); } }, [vehicles, selectedVehicleId]);

  const vehicleBasePrice = selectedVehicle?.sellingPriceTTC || 40000;
  const netVehiclePrice = vehicleBasePrice + optionsTotalTTC - discountTTC;
  const totalSaleTTC = Math.max(
    0,
    netVehiclePrice + registrationFeesTTC + administrativeFeesTTC - (hasTradeIn ? tradeInValueTTC : 0)
  );
  const remainingBalanceTTC = Math.max(0, totalSaleTTC - depositPaidTTC);

  const steps = [
    { num: 1, title: 'Client' },
    { num: 2, title: 'Véhicule' },
    { num: 3, title: 'Prix & Remise' },
    { num: 4, title: 'Reprise' },
    { num: 5, title: 'Financement' },
    { num: 6, title: 'Validation' },
  ];

  const handleFinish = async () => {
    if (!selectedCustomer || !selectedVehicle) {
      addToast({
        type: 'error',
        title: 'Sélection incomplète',
        description: 'Veuillez sélectionner un client et un véhicule.',
      });
      return;
    }

    try { await createSale.mutateAsync({
      customerId: selectedCustomer.id,
      vehicleId: selectedVehicle.id,
      salespersonId: currentUser?.id,
      agencyId: currentAgency?.id,
      vehiclePrice: vehicleBasePrice+optionsTotalTTC+registrationFeesTTC+administrativeFeesTTC-(hasTradeIn?tradeInValueTTC:0),
      discount: discountTTC,
      depositAmount: depositPaidTTC,
      notes,
    });

    addToast({
      type: 'success',
      title: 'Vente automobile enregistrée !',
      description: `Le bon de commande a été généré pour ${selectedCustomer.lastName}. Le véhicule passe en statut Réservé.`,
    });

    onClose(); } catch (error) {
      addToast({ type: 'error', title: 'Vente non enregistrée', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assistant de Création de Vente Automobile"
      description="Étape par étape : configuration commerciale, reprise, financement et contractualisation."
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Stepper Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 overflow-x-auto">
          {steps.map((s, idx) => {
            const isCompleted = step > s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(s.num)}
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-700 text-white ring-2 ring-blue-500/30'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : s.num}
                </button>
                <span
                  className={`text-xs hidden sm:inline-block ${
                    isCurrent ? 'font-bold text-blue-700' : 'text-slate-500'
                  }`}
                >
                  {s.title}
                </span>
                {idx < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 mx-1 hidden sm:inline-block" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Customer Selection */}
        {step === 1 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Sélectionner ou rechercher le client
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {customers.map((c) => {
                const isSelected = selectedCustomerId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        {c.civility} {c.firstName} {c.lastName} {c.company && `(${c.company})`}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {c.email} • {c.phone} • {c.city}
                      </div>
                    </div>
                    <Badge variant={isSelected ? 'primary' : 'default'} size="sm">
                      {c.type}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Vehicle Selection */}
        {step === 2 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              2. Sélectionner le véhicule en stock
            </h4>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {!vehicles.length&&<div className="p-6 text-center text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">Aucun véhicule disponible dans la base de données.</div>}
              {vehicles.filter(v=>v.status==='DISPONIBLE').map((v) => {
                const isSelected = selectedVehicleId === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={v.photos[0]||'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="120"%3E%3Crect width="100%25" height="100%25" fill="%23e2e8f0"/%3E%3C/svg%3E'}
                        alt={v.model}
                        className="w-12 h-10 object-cover rounded-lg border border-slate-200 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-xs text-slate-900">
                          {v.brand} {v.model} — {v.version}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          VIN: {v.vin} • {v.fuel} • {v.mileage.toLocaleString()} km
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xs text-blue-700">
                        {formatCurrency(v.sellingPriceTTC)}
                      </div>
                      <Badge variant={v.status === 'DISPONIBLE' ? 'success' : 'warning'} size="sm">
                        {v.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Pricing & Options & Discount */}
        {step === 3 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              3. Prix, Accessoires & Remise Commerciale
            </h4>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Prix catalogue véhicule TTC</span>
                <span className="font-semibold">{formatCurrency(vehicleBasePrice)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Accessoires & Options supplémentaires TTC (FCFA)
                </label>
                <input
                  type="number"
                  step="100"
                  value={optionsTotalTTC}
                  onChange={(e) => setOptionsTotalTTC(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remise Commerciale TTC (FCFA)
                </label>
                <input
                  type="number"
                  step="100"
                  value={discountTTC}
                  onChange={(e) => setDiscountTTC(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-rose-300 text-rose-700 font-semibold bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Frais d'immatriculation / Carte Grise (FCFA)
                </label>
                <input
                  type="number"
                  value={registrationFeesTTC}
                  onChange={(e) => setRegistrationFeesTTC(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Frais de mise à la route & carburant (FCFA)
                </label>
                <input
                  type="number"
                  value={administrativeFeesTTC}
                  onChange={(e) => setAdministrativeFeesTTC(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Trade-in (Reprise) */}
        {step === 4 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              4. Reprise d'un ancien véhicule (Optionnel)
            </h4>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="tradeInCheck"
                checked={hasTradeIn}
                onChange={(e) => setHasTradeIn(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="tradeInCheck" className="text-xs font-semibold text-slate-800 cursor-pointer">
                Inclure une reprise véhicule dans cette transaction
              </label>
            </div>

            {hasTradeIn && (
              <div className="space-y-3 p-3.5 bg-blue-50/50 rounded-xl border border-blue-200 animate-in fade-in">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Désignation du véhicule repris (Marque, Modèle, Année, km)
                  </label>
                  <input
                    type="text"
                    value={tradeInDetails}
                    onChange={(e) => setTradeInDetails(e.target.value)}
                    placeholder="ex: Renault Clio IV 0.9 TCe 2017 - 65 000 km"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Valeur de reprise ferme TTC (FCFA)
                  </label>
                  <input
                    type="number"
                    step="500"
                    value={tradeInValueTTC}
                    onChange={(e) => setTradeInValueTTC(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-emerald-400 bg-white font-bold text-emerald-700 focus:outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Financing & Payment */}
        {step === 5 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              5. Mode de règlement & Financement
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {(['Comptant', 'LOA', 'LLD', 'Crédit Classique'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFinancingType(mode)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    financingType === mode
                      ? 'border-blue-600 bg-blue-50 font-bold text-blue-700 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <div className="text-xs">{mode}</div>
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Acompte / Premier loyer TTC (FCFA)
                </label>
                <input
                  type="number"
                  step="500"
                  value={depositPaidTTC}
                  onChange={(e) => setDepositPaidTTC(Number(e.target.value))}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
                />
              </div>

              {financingType !== 'Comptant' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Durée du financement (mois)
                  </label>
                  <select
                    value={durationMonths}
                    onChange={(e) => setDurationMonths(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
                  >
                    <option value={24}>24 mois</option>
                    <option value={36}>36 mois</option>
                    <option value={48}>48 mois</option>
                    <option value={60}>60 mois</option>
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date prévisionnelle de livraison
                </label>
                <input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Summary & Validation */}
        {step === 6 && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              6. Récapitulatif du Bon de Commande
            </h4>

            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                <div>
                  <div className="text-xs text-slate-400">Client</div>
                  <div className="font-bold text-sm">
                    {selectedCustomer?.civility} {selectedCustomer?.firstName} {selectedCustomer?.lastName}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400">Conseiller</div>
                  <div className="font-semibold text-xs text-slate-300">{currentUser.name}</div>
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-400">Véhicule</div>
                <div className="font-bold text-sm text-blue-300">
                  {selectedVehicle?.brand} {selectedVehicle?.model} — {selectedVehicle?.version}
                </div>
                <div className="text-[11px] text-slate-400">VIN: {selectedVehicle?.vin}</div>
              </div>

              <div className="space-y-1 text-xs pt-2 border-t border-slate-800">
                <div className="flex justify-between text-slate-300">
                  <span>Prix Véhicule de base</span>
                  <span>{formatCurrency(vehicleBasePrice)}</span>
                </div>
                {optionsTotalTTC > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Options & Accessoires</span>
                    <span>+{formatCurrency(optionsTotalTTC)}</span>
                  </div>
                )}
                {discountTTC > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Remise Commerciale accordée</span>
                    <span>-{formatCurrency(discountTTC)}</span>
                  </div>
                )}
                {hasTradeIn && tradeInValueTTC > 0 && (
                  <div className="flex justify-between text-amber-300">
                    <span>Déduction Reprise Véhicule</span>
                    <span>-{formatCurrency(tradeInValueTTC)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300">
                  <span>Frais administratifs & Immatriculation</span>
                  <span>+{formatCurrency(registrationFeesTTC + administrativeFeesTTC)}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-700">
                  <span>Total Net TTC</span>
                  <span className="text-blue-400">{formatCurrency(totalSaleTTC)}</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400 pt-1">
                  <span>Acompte versé : {formatCurrency(depositPaidTTC)}</span>
                  <span>Solde à financer : {formatCurrency(remainingBalanceTTC)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <Button
            variant="outline"
            size="sm"
            type="button"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Précédent
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>
              Annuler
            </Button>
            {step < 6 ? (
              <Button
                variant="primary"
                size="sm"
                type="button"
                disabled={(step===1&&!selectedCustomerId)||(step===2&&(!vehicles.length||!selectedVehicleId))}
                onClick={() => setStep((s) => Math.min(6, s + 1))}
                icon={<ChevronRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Suivant
              </Button>
            ) : (
              <Button
                variant="success"
                size="sm"
                type="button"
                onClick={handleFinish}
                icon={<FileCheck2 className="w-4 h-4" />}
              >
                Valider & Générer Bon de Commande
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
