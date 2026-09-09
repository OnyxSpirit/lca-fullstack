import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BadgePercent,
  Plus,
  Search,
  Filter,
  DollarSign,
  FileCheck,
  CreditCard,
  Truck,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useQuotationsQuery, useSalesQuery } from '../../api/erpHooks';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { SaleStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { SaleWizardModal } from './SaleWizardModal';
import { TableEmptyState } from '../../components/common/TableEmptyState';
import { useAuthStore } from '../../stores/authStore';
import { canPerformWorkflowAction } from '../../navigation/permissions';
import { openBusinessPdf } from '../../services/businessPdf';

export const SalesListPage: React.FC = () => {
  const salesQuery = useSalesQuery();
  const sales = salesQuery.data ?? [];
  const quotationsQuery=useQuotationsQuery(),quotations=quotationsQuery.data??[];
  const { addToast } = useUiStore();
  const navigate = useNavigate();
  const currentUser=useAuthStore(state=>state.currentUser),roles=currentUser.roles?.length?currentUser.roles:[currentUser.role],canCreate=canPerformWorkflowAction(roles,'sales.create');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const filteredSales = sales.filter((s) => {
    const matchesSearch =
      s.saleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.vehicleLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.salesRepName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || s.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });
  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedStatus !== 'ALL';

  const totalRevenue = sales.reduce((acc, s) => acc + s.totalSaleTTC, 0);
  const financedCount = sales.filter((s) => s.financingType !== 'Comptant').length;
  const financedRate = Math.round((financedCount / (sales.length || 1)) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventes & Propositions Commerciales"
        subtitle="Gestion des dossiers de vente VN/VO, financements, reprises et bons de commande."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Commercial' }, { label: 'Ventes' }]}
        actions={
          canCreate?<Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsWizardOpen(true)}
          >
            Nouvelle Vente
          </Button>:null
        }
      />

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Chiffre d'Affaires Ventes</span>
            <div className="text-xl font-bold text-blue-700 mt-0.5">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <Badge variant="primary" size="md">{sales.length} dossiers</Badge>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Taux de Pénétration Financement</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">
              {financedRate}% <span className="text-xs text-slate-400 font-normal">({financedCount}/{sales.length} LOA/LLD)</span>
            </div>
          </div>
          <Badge variant="success" size="md">Performant</Badge>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Panier Moyen Véhicule</span>
            <div className="text-xl font-bold text-slate-900 mt-0.5">
              {formatCurrency(totalRevenue / (sales.length || 1))}
            </div>
          </div>
          <Badge variant="default" size="md">TTC</Badge>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par client, n° vente, modèle..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Tous statuts ({sales.length})</option>
            <option value="COMMANDE">Commande signée</option>
            <option value="FINANCEMENT_EN_ATTENTE">Financement en attente</option>
            <option value="FINANCEMENT_ACCEPTE">Financement accepté</option>
            <option value="ACOMPTE_VERSE">Acompte versé</option>
            <option value="LIVRAISON_PLANIFIEE">Livraison planifiée</option>
            <option value="LIVRE">Livré</option>
          </select>
        </div>
      </div>

      <Card padding="none"><div className="border-b p-4"><h2 className="font-bold text-slate-900">Propositions et devis</h2><p className="text-xs text-slate-500">Même source de vérité que les devis créés depuis le CRM.</p></div>{quotationsQuery.isError&&<div className="p-4 text-sm text-red-700">Chargement des devis impossible : {quotationsQuery.error.message}</div>}<div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-3">Référence</th><th>Client</th><th>Véhicule</th><th>Commercial</th><th>Montant</th><th>Statut</th><th></th></tr></thead><tbody>{quotations.map(quote=><tr key={quote.id} className="border-t"><td className="p-3 font-mono font-bold">{quote.quotationNumber}</td><td>{quote.customerName}</td><td>{quote.vehicleLabel}</td><td>{quote.salespersonName}</td><td>{formatCurrency(quote.total)}</td><td>{quote.status}</td><td><Button size="xs" variant="outline" onClick={()=>openBusinessPdf('quotation',quote.id).catch(error=>addToast({type:'error',title:'PDF indisponible',description:error.message}))}>PDF</Button></td></tr>)}{!quotationsQuery.isLoading&&!quotations.length&&<TableEmptyState colSpan={7} message="Aucun devis"/>}</tbody></table></div></Card>

      {/* Sales Table */}
      <Card padding="none">
        {salesQuery.isError && (
          <div className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Chargement des ventes impossible : {salesQuery.error instanceof Error ? salesQuery.error.message : 'Erreur API'}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">N° Vente & Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Véhicule Vendu</th>
                <th className="py-3 px-4">Montant TTC</th>
                <th className="py-3 px-4">Mode Règlement</th>
                <th className="py-3 px-4">Conseiller</th>
                <th className="py-3 px-4">Statut Vente</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salesQuery.isLoading && (
                <TableEmptyState colSpan={8} message="Chargement des ventes..." isLoading />
              )}
              {!salesQuery.isLoading && !salesQuery.isError && filteredSales.length === 0 && (
                <TableEmptyState
                  colSpan={8}
                  message={hasActiveFilters ? 'Aucune vente ne correspond à vos critères' : 'Aucune vente'}
                />
              )}
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  onClick={() => navigate(`/sales/${sale.id}`)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{sale.saleNumber}</div>
                    <div className="text-[10px] text-slate-400">{formatDate(sale.contractDate)}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{sale.customerName}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{sale.vehicleLabel}</td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-blue-700">{formatCurrency(sale.totalSaleTTC)}</div>
                    {sale.depositPaidTTC > 0 && (
                      <div className="text-[10px] text-emerald-600">Acompte: {formatCurrency(sale.depositPaidTTC)}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-medium text-slate-700">{sale.financingType}</span>
                    {sale.monthlyPayment && (
                      <div className="text-[10px] text-slate-400">{formatCurrency(sale.monthlyPayment)}/mois</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{sale.salesRepName}</td>
                  <td className="py-3 px-4">
                    <StatusBadge status={sale.status} type="sale" />
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="xs" variant="outline" onClick={() => navigate(`/sales/${sale.id}`)}>
                      Détail
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Sale Wizard Modal */}
      <SaleWizardModal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
      />
    </div>
  );
};
