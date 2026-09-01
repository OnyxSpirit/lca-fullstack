import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Layers,
  ArrowRight,
  TrendingDown,
  Truck,
  CheckCircle2,
} from 'lucide-react';
import { useCreatePart, usePartMovement, usePartsQuery } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../lib/utils';
import { SparePart } from '../../types';

export const SparePartsPage: React.FC = () => {
  const spareParts = usePartsQuery().data ?? []; const partMovement = usePartMovement(); const createPart=useCreatePart(); const currentAgency = useAuthStore((s) => s.currentAgency);
  const { addToast } = useUiStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [isNewPartModalOpen, setIsNewPartModalOpen] = useState(false);

  const [newPartForm, setNewPartForm] = useState({
    reference: '',
    oemReference: '',
    name: '',
    category: 'Filtration' as SparePart['category'],
    supplier: 'Valeo Distribution',
    stockQuantity: 10,
    minStockAlert: 5,
    maxStockLevel: 50,
    purchasePriceHT: 25,
    sellingPriceHT: 45,
    tvaRate: 20,
    locationBin: 'A-01-01',
    compatibilityList: ['Multi-marques'],
  });

  const filteredParts = spareParts.filter((p) => {
    const matchesSearch =
      p.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.oemReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.locationBin.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesLowStock = !onlyLowStock || p.stockQuantity <= p.minStockAlert;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const lowStockCount = spareParts.filter((p) => p.stockQuantity <= p.minStockAlert).length;
  const totalStockValueHT = spareParts.reduce((sum, p) => sum + p.stockQuantity * p.purchasePriceHT, 0);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    try { await createPart.mutateAsync({reference:newPartForm.reference,name:newPartForm.name,brand:newPartForm.supplier,purchasePrice:newPartForm.purchasePriceHT,salePrice:newPartForm.sellingPriceHT,minStock:newPartForm.minStockAlert,maxStock:newPartForm.maxStockLevel,currentStock:newPartForm.stockQuantity}); addToast({
      type: 'success',
      title: 'Référence créée',
      description: `La pièce ${newPartForm.reference} a été ajoutée à l'inventaire.`,
    });
    setIsNewPartModalOpen(false); } catch(error){addToast({type:'error',title:'Création impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  const handleRestock = async (partId: string, currentQty: number) => {
    try { await partMovement.mutateAsync({ id: partId, agencyId: currentAgency?.id, movementType: 'purchase', quantity: 10, reason: 'Réassort manuel' }); addToast({
      type: 'success',
      title: 'Réassort enregistré (+10)',
      description: 'Le stock disponible a été incrémenté avec succès.',
    }); }catch(error){addToast({type:'error',title:'Réassort impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Magasin Pièces de Rechange (PR) & Stocks"
        subtitle="Catalogue des références constructeur, OEM, inventaire temps réel et réassorts atelier."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Après-Vente' }, { label: 'Pièces & Stocks' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Truck className="w-4 h-4" />}
              disabled
              title="La gestion des fournisseurs doit être configurée avant l’émission d’un bon de commande."
            >
              Commande Fournisseur ({lowStockCount}) — à configurer
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewPartModalOpen(true)}
            >
              Nouvelle Référence PR
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Références Cataloguées</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{spareParts.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">8 catégories actives</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Valeur Stock Immobilisé (HT)</span>
          <div className="text-2xl font-bold text-blue-700 mt-1">{formatCurrency(totalStockValueHT)}</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Rotation saine</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Alertes Stock Bas / Rupture</span>
          <div className="text-2xl font-bold text-rose-600 mt-1">{lowStockCount}</div>
          <span className="text-[11px] text-rose-600 font-semibold mt-1 block">Réapprovisionnement requis</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Taux de Service Atelier</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">96.4%</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Pièces servies sans délai</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par référence, OEM, désignation, casier..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Toutes familles de pièces</option>
            <option value="Freinage">Freinage</option>
            <option value="Filtration">Filtration</option>
            <option value="Moteur">Moteur</option>
            <option value="Électrique">Électrique & Batterie</option>
            <option value="Carrosserie">Carrosserie</option>
            <option value="Suspension">Suspension & Trains</option>
            <option value="Pneumatique">Pneumatiques</option>
            <option value="Fluides & Huiles">Fluides & Huiles</option>
          </select>

          <button
            onClick={() => setOnlyLowStock(!onlyLowStock)}
            className={`px-3 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
              onlyLowStock
                ? 'bg-rose-50 border-rose-300 text-rose-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Alertes stock ({lowStockCount})
          </button>
        </div>
      </div>

      {/* Parts Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Réf interne & OEM</th>
                <th className="py-3 px-4">Désignation & Compatibilité</th>
                <th className="py-3 px-4">Famille & Fournisseur</th>
                <th className="py-3 px-4">Emplacement / Casier</th>
                <th className="py-3 px-4">Stock Dispo</th>
                <th className="py-3 px-4">Prix Achat HT</th>
                <th className="py-3 px-4">Prix Vente HT / TTC</th>
                <th className="py-3 px-4">Marge %</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.map((p) => {
                const marginPercent = Math.round(
                  ((p.sellingPriceHT - p.purchasePriceHT) / (p.sellingPriceHT || 1)) * 100
                );
                const isCritical = p.stockQuantity <= p.minStockAlert;

                return (
                  <tr key={p.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-blue-700">{p.reference}</div>
                      <div className="font-mono text-[10px] text-slate-400">OEM: {p.oemReference}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{p.name}</div>
                      <div className="text-[10px] text-slate-400">{p.compatibilityList.join(', ')}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-700">{p.category}</span>
                      <div className="text-[10px] text-slate-400">{p.supplier}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        {p.locationBin}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-bold ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>
                          {p.stockQuantity}
                        </span>
                        {isCritical && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-semibold">
                            Seuil {p.minStockAlert}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatCurrency(p.purchasePriceHT)}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{formatCurrency(p.sellingPriceHT * 1.2)} TTC</div>
                      <div className="text-[10px] text-slate-400">{formatCurrency(p.sellingPriceHT)} HT</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">+{marginPercent}%</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="xs"
                        variant={isCritical ? 'primary' : 'outline'}
                        icon={<Truck className="w-3.5 h-3.5" />}
                        onClick={() => handleRestock(p.id, p.stockQuantity)}
                      >
                        +10 Réassort
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Part Modal */}
      <Modal
        isOpen={isNewPartModalOpen}
        onClose={() => setIsNewPartModalOpen(false)}
        title="Créer une Référence Pièce de Rechange"
        description="Ajout d'un article au catalogue magasin et paramétrage du casier."
        maxWidth="md"
      >
        <form onSubmit={handleCreatePart} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Réf Interne *</label>
              <input
                type="text"
                required
                value={newPartForm.reference}
                onChange={(e) => setNewPartForm({ ...newPartForm, reference: e.target.value })}
                placeholder="ex: PR-VAL-7821"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Réf Constructeur OEM *</label>
              <input
                type="text"
                required
                value={newPartForm.oemReference}
                onChange={(e) => setNewPartForm({ ...newPartForm, oemReference: e.target.value })}
                placeholder="ex: 16 118 412 80"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Désignation de la pièce *</label>
            <input
              type="text"
              required
              value={newPartForm.name}
              onChange={(e) => setNewPartForm({ ...newPartForm, name: e.target.value })}
              placeholder="ex: Jeu de 4 plaquettes de frein avant"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Famille / Catégorie</label>
              <select
                value={newPartForm.category}
                onChange={(e) => setNewPartForm({ ...newPartForm, category: e.target.value as any })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Freinage">Freinage</option>
                <option value="Filtration">Filtration</option>
                <option value="Moteur">Moteur</option>
                <option value="Électrique">Électrique & Batterie</option>
                <option value="Carrosserie">Carrosserie</option>
                <option value="Suspension">Suspension & Trains</option>
                <option value="Pneumatique">Pneumatiques</option>
                <option value="Fluides & Huiles">Fluides & Huiles</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emplacement / Casier</label>
              <input
                type="text"
                value={newPartForm.locationBin}
                onChange={(e) => setNewPartForm({ ...newPartForm, locationBin: e.target.value })}
                placeholder="ex: B-03-2"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Initial</label>
              <input
                type="number"
                value={newPartForm.stockQuantity}
                onChange={(e) => setNewPartForm({ ...newPartForm, stockQuantity: parseInt(e.target.value) || 0 })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Seuil Alerte</label>
              <input
                type="number"
                value={newPartForm.minStockAlert}
                onChange={(e) => setNewPartForm({ ...newPartForm, minStockAlert: parseInt(e.target.value) || 0 })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prix Achat HT (FCFA)</label>
              <input
                type="number"
                value={newPartForm.purchasePriceHT}
                onChange={(e) => setNewPartForm({ ...newPartForm, purchasePriceHT: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsNewPartModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              Enregistrer Référence
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
