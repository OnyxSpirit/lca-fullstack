import React, { useEffect, useState } from 'react';
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
import { useRepairOrdersPageQuery } from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RepairOrderStatus } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { NewRepairOrderModal } from './NewRepairOrderModal';
import { TableEmptyState } from '../../components/common/TableEmptyState';
import { useAuthStore } from '../../stores/authStore';
import { ExternalCustomersPanel } from './ExternalCustomersPanel';
import { SavBillingSection, SavJournalSection, SavReportingSection, SavTransitSection } from './SavBusinessSections';

export const ServiceDashboardPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [page,setPage]=useState(1);
  const repairQuery=useRepairOrdersPageQuery({page,pageSize:7,search:searchQuery,status:selectedStatus==='ALL'?undefined:selectedStatus});
  const repairOrders = repairQuery.data?.items ?? [];
  const navigate = useNavigate();
  const can=useAuthStore(state=>state.can),canCreate=can('service.order.create');
  const canViewExternalCustomers=can('service.order.view')&&can('customers.view');

  const [isNewOrOpen, setIsNewOrOpen] = useState(false);
  const [activeView,setActiveView]=useState<'orders'|'billing'|'transit'|'journal'|'reporting'|'external-customers'>('orders');
  const [newOrderCustomerId,setNewOrderCustomerId]=useState<string|undefined>();
  useEffect(()=>{if(repairQuery.data&&repairQuery.data.page!==page)setPage(repairQuery.data.page)},[repairQuery.data,page]);
  const hasActiveFilters = Boolean(searchQuery.trim()) || selectedStatus !== 'ALL';

  return (
    <div className="space-y-6">
      <PageHeader
        title="SAV / Atelier"
        subtitle="Ordres de réparation, facturation, fonds de transit, traçabilité et reporting métier."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Après-Vente' }, { label: 'Ordres de Réparation' }]}
        actions={
          <div className="flex items-center gap-2">
            {canCreate&&<Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewOrOpen(true)}
            >
              Ouvrir un OR
            </Button>}
          </div>
        }
      />

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200">{[
        ['orders','Ordres de réparation',can('service.order.view')],
        ['billing','Facturation SAV',can('service.billing.view')],
        ['transit','Caisse de transit',can('service.transit.view')],
        ['journal','Journal des opérations',can('service.journal.view')],
        ['reporting','Reporting SAV',can('service.reporting.view')],
        ['external-customers','Clients extérieurs',canViewExternalCustomers],
      ].filter(([, ,visible])=>visible).map(([key,label])=><button key={String(key)} type="button" onClick={()=>setActiveView(key as typeof activeView)} className={`shrink-0 border-b-2 px-4 py-2.5 text-xs font-bold ${activeView===key?'border-blue-600 text-blue-700':'border-transparent text-slate-500'}`}>{label}</button>)}</div>

      {activeView==='orders'&&<>
      {/* Search and Filters */}
      {repairQuery.isError&&<div className="p-4 rounded-xl border border-red-200 bg-red-50 text-sm text-red-800">{repairQuery.error instanceof Error?repairQuery.error.message:'Erreur API SAV'}</div>}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {setSearchQuery(e.target.value);setPage(1)}}
            placeholder="Rechercher par n° OR, client, plaque, modèle, technicien..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => {setSelectedStatus(e.target.value);setPage(1)}}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Tous les statuts ({repairQuery.data?.total??0})</option>
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
            <option value="ANNULE">Annulé</option>
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
              {!repairQuery.isLoading && !repairQuery.isError && repairOrders.length === 0 && (
                <TableEmptyState
                  colSpan={8}
                  message={hasActiveFilters
                    ? 'Aucun ordre de réparation ne correspond à vos critères'
                    : 'Aucun ordre de réparation'}
                />
              )}
              {repairOrders.map((orItem) => (
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
        <div className="flex items-center justify-between border-t p-4 text-xs"><span>{repairQuery.data?.total??0} ordre(s)</span><div className="flex gap-2"><Button size="xs" variant="outline" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Précédent</Button><span>Page {page}/{Math.max(1,repairQuery.data?.totalPages??1)}</span><Button size="xs" variant="outline" disabled={page>=(repairQuery.data?.totalPages??1)} onClick={()=>setPage(p=>p+1)}>Suivant</Button></div></div>
      </Card>
      </>}

      {activeView==='billing'&&<SavBillingSection/>}
      {activeView==='transit'&&<SavTransitSection/>}
      {activeView==='journal'&&<SavJournalSection/>}
      {activeView==='reporting'&&<SavReportingSection/>}

      {activeView==='external-customers'&&canViewExternalCustomers&&<ExternalCustomersPanel canCreateOrder={canCreate} canViewCustomer={can('customers.view')} onNewOrder={customerId=>{setNewOrderCustomerId(customerId);setIsNewOrOpen(true)}}/>}

      {/* New Repair Order Modal */}
      <NewRepairOrderModal
        isOpen={isNewOrOpen}
        initialCustomerId={newOrderCustomerId}
        onClose={() => {setIsNewOrOpen(false);setNewOrderCustomerId(undefined)}}
      />
    </div>
  );
};
