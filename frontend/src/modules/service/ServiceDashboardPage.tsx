import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Car,
  User,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useRepairOrdersQuery, useRepairStatsQuery } from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RepairOrderStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { NewRepairOrderModal } from './NewRepairOrderModal';
import { TableEmptyState } from '../../components/common/TableEmptyState';

export const ServiceDashboardPage: React.FC = () => {
  const repairQuery=useRepairOrdersQuery();
  const repairOrders = repairQuery.data ?? [];
  const stats=useRepairStatsQuery();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isNewOrOpen, setIsNewOrOpen] = useState(false);

  const filteredORs = repairOrders.filter((or) => {
    const matchesSearch =
      or.orNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      or.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      or.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      or.vehicleModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (or.technicianName??'').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || or.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });
  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedStatus !== 'ALL';

  const openORCount = repairOrders.filter((o) => o.status !== 'CLOTURE' && o.status !== 'FACTURE').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="SAV & Ordres de Réparation (OR)"
        subtitle="Suivi des réceptions atelier, diagnostics, barèmes de temps et facturation après-vente."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Après-Vente' }, { label: 'Ordres de Réparation' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Calendar className="w-4 h-4" />}
              onClick={() => navigate('/workshop')}
            >
              Planning Ponts
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewOrOpen(true)}
            >
              Ouvrir un OR
            </Button>
          </div>
        }
      />

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">OR en cours à l'Atelier</span>
            <div className="text-xl font-bold text-blue-700 mt-0.5">
              {openORCount} véhicules
            </div>
          </div>
          <Badge variant="primary" size="md">En cours</Badge>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Taux d'Occupation des Ponts</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">
              {Number(stats.data?.baysTotal)?Math.round(Number(stats.data.baysOccupied)/Number(stats.data.baysTotal)*100):0}%
            </div>
          </div>
          <Badge variant="success" size="md">{Number(stats.data?.baysOccupied??0)}/{Number(stats.data?.baysTotal??0)} ponts</Badge>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Garanties Constructeur</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {repairOrders.filter((o) => o.warrantyCovered).length} dossiers
            </div>
          </div>
          <Badge variant="default" size="md">Prise en charge</Badge>
        </div>
      </div>

      {/* Search and Filters */}
      {repairQuery.isError&&<div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">{repairQuery.error instanceof Error?repairQuery.error.message:'Erreur API SAV'}</div>}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par n° OR, client, plaque, modèle, technicien..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Tous les statuts ({repairOrders.length})</option>
            <option value="PLANIFIE">Planifié</option>
            <option value="RECEPTIONNE">Réceptionné</option>
            <option value="DIAGNOSTIC">En diagnostic</option>
            <option value="ATTENTE_VALIDATION">Attente validation client</option>
            <option value="EN_COURS">Travaux en cours</option>
            <option value="CONTROLE_QUALITE">Contrôle qualité</option>
            <option value="PRET">Prêt</option>
            <option value="FACTURE">Facturé</option>
            <option value="LIVRE">Véhicule remis</option>
            <option value="CLOTURE">Clôturé</option>
          </select>
        </div>
      </div>

      {/* Repair Orders Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">N° OR & Date</th>
                <th className="py-3 px-4">Client & Contact</th>
                <th className="py-3 px-4">Véhicule & Immat</th>
                <th className="py-3 px-4">Symptômes / Travaux</th>
                <th className="py-3 px-4">Pont & Technicien</th>
                <th className="py-3 px-4">Montant Estimé</th>
                <th className="py-3 px-4">Statut OR</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {repairQuery.isLoading && (
                <TableEmptyState colSpan={8} message="Chargement des ordres de réparation..." isLoading />
              )}
              {!repairQuery.isLoading && !repairQuery.isError && filteredORs.length === 0 && (
                <TableEmptyState
                  colSpan={8}
                  message={hasActiveFilters
                    ? 'Aucun ordre de réparation ne correspond à vos critères'
                    : 'Aucun ordre de réparation'}
                />
              )}
              {filteredORs.map((orItem) => (
                <tr
                  key={orItem.id}
                  onClick={() => navigate(`/service/repair-orders/${orItem.id}`)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{orItem.orNumber}</div>
                    <div className="text-[10px] text-slate-400">{orItem.appointmentDate}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-800">{orItem.customerName}</div>
                    <div className="text-[10px] text-slate-400">{orItem.customerPhone}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{orItem.vehicleModel}</div>
                    <div className="text-[11px] font-mono text-slate-600">{orItem.vehiclePlate}</div>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate text-slate-600">
                    {orItem.symptomsReported}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-800">{orItem.bayNumber}</div>
                    <div className="text-[10px] text-slate-400">{orItem.technicianName}</div>
                  </td>
                  <td className="py-3 px-4 font-bold text-blue-700">
                    {formatCurrency(orItem.finalTotalTTC || orItem.estimatedTotalTTC)}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={orItem.status} type="or" />
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="xs" variant="outline" onClick={() => navigate(`/service/repair-orders/${orItem.id}`)}>
                      Détail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Repair Order Modal */}
      <NewRepairOrderModal
        isOpen={isNewOrOpen}
        onClose={() => setIsNewOrOpen(false)}
      />
    </div>
  );
};
