import React, { useDeferredValue, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Car,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  AlertTriangle,
  Fuel,
  Gauge,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useVehiclesQuery } from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { VehicleStatus, FuelType } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { NewVehicleModal } from './NewVehicleModal';

export const VehiclesListPage: React.FC = () => {
  const navigate = useNavigate();

  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedFuel, setSelectedFuel] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [onlyDormant, setOnlyDormant] = useState(false);
  const [isNewVehicleOpen, setIsNewVehicleOpen] = useState(false);
  const deferredSearch=useDeferredValue(searchQuery);
  const statusToDb:Record<string,string>={COMMANDE:'ordered',EN_TRANSIT:'in_transit',RECEPTIONNE:'received',PREPARATION:'preparation',DISPONIBLE:'available',RESERVE:'reserved',VENDU:'sold',LIVRE:'delivered'};
  const vehiclesQuery=useVehiclesQuery({search:deferredSearch,status:selectedStatus==='ALL'?'':statusToDb[selectedStatus],type:selectedType==='ALL'?'':selectedType,fuel:selectedFuel==='ALL'?'':selectedFuel,dormant:onlyDormant});
  const vehicles = vehiclesQuery.data ?? [];

  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.registrationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.stockNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || v.status === selectedStatus;
    const matchesFuel = selectedFuel === 'ALL' || v.fuel === selectedFuel;
    const matchesDormant = !onlyDormant || v.stockDays > 60;

    return matchesSearch && matchesStatus && matchesFuel && matchesDormant;
  });

  const availableCount = vehicles.filter((v) => v.status === 'DISPONIBLE').length;
  const dormantCount = vehicles.filter((v) => v.stockDays > 60).length;
  const totalStockValue = vehicles.reduce((sum, v) => sum + v.sellingPriceTTC, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parc & Stock Véhicules (VN / VO)"
        subtitle="Catalogue de véhicules neufs, occasions et démonstration en stock concession."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Commercial' }, { label: 'Stock Véhicules' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Grille
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Tableau
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewVehicleOpen(true)}
            >
              Entrée en Stock
            </Button>
          </div>
        }
      />

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Disponibles à la vente</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {availableCount} <span className="text-xs text-slate-400 font-normal">/ {vehicles.length} total</span>
            </div>
          </div>
          <Badge variant="success" size="md">En stock</Badge>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Valeur Marchande du Parc</span>
            <div className="text-xl font-bold text-blue-700 mt-0.5">
              {formatCurrency(totalStockValue)}
            </div>
          </div>
          <Badge variant="primary" size="md">TTC</Badge>
        </div>

        <div
          onClick={() => setOnlyDormant(!onlyDormant)}
          className={`p-4 rounded-xl border shadow-2xs flex items-center justify-between cursor-pointer transition-all ${
            onlyDormant
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-400/20'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div>
            <span className="text-xs text-amber-700 font-semibold flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Stock Dormant (&gt; 60 jours)
            </span>
            <div className="text-xl font-bold text-rose-600 mt-0.5">
              {dormantCount} véhicules
            </div>
          </div>
          <Badge variant="danger" size="md">
            {onlyDormant ? 'Filtre actif' : 'Filtrer'}
          </Badge>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par marque, modèle, VIN, immatriculation..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedType} onChange={(e)=>setSelectedType(e.target.value)} className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium">
            <option value="ALL">Tous types</option><option value="new">VN</option><option value="used">VO</option><option value="demo">Démonstration</option><option value="courtesy">Courtoisie</option>
          </select>
          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Tous statuts</option>
            <option value="DISPONIBLE">Disponible</option>
            <option value="PREPARATION">En préparation</option>
            <option value="RESERVE">Réservé</option>
            <option value="VENDU">Vendu</option>
            <option value="COMMANDE">Commandé</option>
            <option value="LIVRE">Livré</option>
          </select>

          {/* Fuel Filter */}
          <select
            value={selectedFuel}
            onChange={(e) => setSelectedFuel(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Toutes énergies</option>
            <option value="Hybride Rechargeable">Hybride Rechargeable</option>
            <option value="Électrique">Électrique</option>
            <option value="Hybride">Hybride</option>
            <option value="Essence">Essence</option>
            <option value="Diesel">Diesel</option>
          </select>
        </div>
      </div>

      {vehiclesQuery.isLoading&&<div className="p-8 text-center text-sm text-slate-500">Chargement du stock…</div>}
      {vehiclesQuery.isError&&<div className="p-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800"><strong>Stock indisponible.</strong> {vehiclesQuery.error instanceof Error?vehiclesQuery.error.message:'Erreur API'}</div>}
      {!vehiclesQuery.isLoading&&!vehiclesQuery.isError&&vehicles.length===0&&<div className="p-10 bg-white border border-dashed rounded-xl text-center"><Car className="w-10 h-10 mx-auto text-slate-300 mb-2"/><p className="font-semibold text-slate-700">Aucun véhicule ne correspond aux critères.</p><p className="text-xs text-slate-500">Ajoutez un véhicule avec sa photo principale pour démarrer le catalogue.</p></div>}

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVehicles.map((v) => (
            <div
              key={v.id}
              onClick={() => navigate(`/vehicles/${v.id}`)}
              className="bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-blue-400 transition-all cursor-pointer overflow-hidden flex flex-col justify-between group"
            >
              <div>
                {/* Photo & Status Overlay */}
                <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                  <img
                    src={v.photos[0]||'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="450"%3E%3Crect width="100%25" height="100%25" fill="%23e2e8f0"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" fill="%2364748b" font-size="24"%3EAucune photo%3C/text%3E%3C/svg%3E'}
                    alt={`${v.brand} ${v.model}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute top-2.5 left-2.5">
                    <StatusBadge status={v.status} type="vehicle" />
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <Badge variant={v.type === 'Neuf' ? 'primary' : 'default'} size="sm">
                      {v.type}
                    </Badge>
                  </div>
                  {v.stockDays > 60 && (
                    <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-rose-600/90 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs">
                      <AlertTriangle className="w-3 h-3" />
                      {v.stockDays} jours en stock
                    </div>
                  )}
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors">
                      {v.brand} {v.model}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{v.version}</p>
                  </div>

                  {/* Badges Info */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{v.mileage.toLocaleString()} km</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{v.fuel}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{v.year} • {v.transmission}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
                      <span>{v.registrationNumber || 'Nouveau'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Price & Margin Footer */}
              <div className="p-4 pt-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Prix Vente TTC</span>
                  <span className="text-base font-bold text-blue-700">
                    {formatCurrency(v.sellingPriceTTC)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Marge Cible HT</span>
                  <span className="text-xs font-bold text-emerald-600">
                    +{formatCurrency(v.targetMarginHT)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Véhicule</th>
                  <th className="py-3 px-4">VIN / Immat</th>
                  <th className="py-3 px-4">Énergie & Boîte</th>
                  <th className="py-3 px-4">Kilométrage</th>
                  <th className="py-3 px-4">Jours en Stock</th>
                  <th className="py-3 px-4">Prix Vente TTC</th>
                  <th className="py-3 px-4">Marge Cible HT</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.map((v) => (
                  <tr
                    key={v.id}
                    onClick={() => navigate(`/vehicles/${v.id}`)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={v.photos[0]||'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="120"%3E%3Crect width="100%25" height="100%25" fill="%23e2e8f0"/%3E%3C/svg%3E'}
                          alt={v.model}
                          className="w-12 h-9 object-cover rounded-md border border-slate-200 shrink-0"
                        />
                        <div>
                          <span className="font-bold text-slate-900">{v.brand} {v.model}</span>
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">{v.version}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-slate-800">{v.vin}</div>
                      <div className="text-[10px] text-slate-400">{v.registrationNumber}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{v.fuel}</div>
                      <div className="text-[11px] text-slate-400">{v.transmission}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{v.mileage.toLocaleString()} km</td>
                    <td className="py-3 px-4">
                      <span className={v.stockDays > 60 ? 'font-bold text-rose-600' : 'text-slate-600'}>
                        {v.stockDays} j
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-blue-700">{formatCurrency(v.sellingPriceTTC)}</td>
                    <td className="py-3 px-4 font-bold text-emerald-600">+{formatCurrency(v.targetMarginHT)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={v.status} type="vehicle" />
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button size="xs" variant="outline" onClick={() => navigate(`/vehicles/${v.id}`)}>
                        Détail
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* New Vehicle Modal */}
      <NewVehicleModal
        isOpen={isNewVehicleOpen}
        onClose={() => setIsNewVehicleOpen(false)}
      />
    </div>
  );
};
