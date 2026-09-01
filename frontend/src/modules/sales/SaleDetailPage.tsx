import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BadgePercent,
  Printer,
  CheckCircle2,
  Truck,
  CreditCard,
  User,
  Car,
  DollarSign,
  FileText,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useSaleDetailQuery, useSaleStatusMutation } from '../../api/erpHooks';
import { saleStatusToDb } from '../../services/mysqlStatusMap';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { openBusinessPdf } from '../../services/businessPdf';

export const SaleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const salesQuery = useSaleDetailQuery(id); const saleStatus = useSaleStatusMutation();
  const { addToast } = useUiStore();

  const sale = salesQuery.data;

  if (salesQuery.isLoading) return <div className="p-8 text-sm text-slate-500">Chargement du dossier de vente…</div>;
  if (!sale) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Dossier de vente introuvable.</p>
        <Button variant="outline" onClick={() => navigate('/sales')}>
          Retour aux ventes
        </Button>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: keyof typeof saleStatusToDb) => {
    const status = saleStatusToDb[newStatus];
    try {
      await saleStatus.mutateAsync({ id: sale.id, status });
      addToast({ type: 'success', title: 'Statut du dossier mis à jour', description: `Le dossier est maintenant : ${newStatus}.` });
    } catch (error) {
      addToast({ type: 'error', title: 'Transition impossible', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };

  const nextStatus: Partial<Record<typeof sale.status, keyof typeof saleStatusToDb>> = {
    RESERVATION: 'COMMANDE', COMMANDE: 'FINANCEMENT_VALIDE', FINANCEMENT_VALIDE: 'PREPARATION', PREPARATION: 'PRET_LIVRAISON',
  };
  const nextLabel: Record<string, string> = { COMMANDE: 'Confirmer la commande', FINANCEMENT_VALIDE: 'Valider le financement', PREPARATION: 'Lancer la préparation', PRET_LIVRAISON: 'Déclarer prêt à livrer' };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Dossier de Vente : ${sale.saleNumber}`}
        subtitle={`Client : ${sale.customerName} • Conseiller commercial : ${sale.salesRepName}`}
        breadcrumbs={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Ventes', href: '/sales' },
          { label: sale.saleNumber },
        ]}
        badge={<StatusBadge status={sale.status} type="sale" />}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => openBusinessPdf('sale',sale.id).catch(error=>addToast({type:'error',title:'PDF indisponible',description:error.message}))}
            >
              Imprimer Bon de Commande
            </Button>

            {nextStatus[sale.status] && <Button variant="primary" size="sm" loading={saleStatus.isPending} icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => handleStatusChange(nextStatus[sale.status]!)}>{nextLabel[nextStatus[sale.status]!]}</Button>}
            {sale.status === 'PRET_LIVRAISON' && <Button variant="success" size="sm" icon={<Truck className="w-4 h-4" />} onClick={() => navigate('/deliveries')}>Planifier la livraison</Button>}
          </div>
        }
      />

      {/* Main 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Official Order Sheet Preview (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Bon de Commande Véhicule Automobile</CardTitle>
                <span className="text-xs text-slate-500">Document contractuel conforme à la réglementation</span>
              </div>
              <Badge variant="primary" size="sm">N° {sale.saleNumber}</Badge>
            </CardHeader>

            <div className="space-y-6 text-xs">
              {/* Parties */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Acheteur / Client
                  </span>
                  <div className="font-bold text-slate-900 text-sm">{sale.customerName}</div>
                  <div className="text-slate-500 mt-1">Dossier client n° {sale.customerId}</div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Vendeur / Concession
                  </span>
                  <div className="font-bold text-slate-900 text-sm">La Congolaise de l'Automobile</div>
                  <div className="text-slate-500 mt-1">Conseiller : {sale.salesRepName}</div>
                </div>
              </div>

              {/* Vehicle Sold */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Désignation du Véhicule Commandé
                </span>
                <div className="font-bold text-slate-900 text-base text-blue-700">
                  {sale.vehicleLabel}
                </div>
                <div className="flex gap-4 text-slate-500 pt-1 text-[11px]">
                  <span>Date du contrat : {formatDate(sale.contractDate)}</span>
                  <span>Date livraison convenue : {formatDate(sale.expectedDeliveryDate)}</span>
                </div>
              </div>

              {/* Financial Decomposition Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                    <tr>
                      <th className="py-2.5 px-4">Éléments de la Commande</th>
                      <th className="py-2.5 px-4 text-right">Montant TTC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-2.5 px-4 text-slate-800">Prix de base du véhicule catalogue</td>
                      <td className="py-2.5 px-4 text-right font-medium">{formatCurrency(sale.vehiclePriceTTC)}</td>
                    </tr>
                    {sale.optionsTotalTTC > 0 && (
                      <tr>
                        <td className="py-2.5 px-4 text-slate-800">Options, Accessoires & Pack Livraison</td>
                        <td className="py-2.5 px-4 text-right font-medium">+{formatCurrency(sale.optionsTotalTTC)}</td>
                      </tr>
                    )}
                    {sale.discountTTC > 0 && (
                      <tr>
                        <td className="py-2.5 px-4 text-emerald-600 font-medium">Remise Commerciale Exceptionnelle</td>
                        <td className="py-2.5 px-4 text-right text-emerald-600 font-bold">-{formatCurrency(sale.discountTTC)}</td>
                      </tr>
                    )}
                    {sale.tradeInValueTTC > 0 && (
                      <tr>
                        <td className="py-2.5 px-4 text-amber-700">
                          Reprise Ancien Véhicule ({sale.tradeInVehicleDetails || 'Véhicule client'})
                        </td>
                        <td className="py-2.5 px-4 text-right text-amber-700 font-bold">-{formatCurrency(sale.tradeInValueTTC)}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-2.5 px-4 text-slate-800">Frais d'Immatriculation & Mise à la route</td>
                      <td className="py-2.5 px-4 text-right font-medium">
                        +{formatCurrency(sale.registrationFeesTTC + sale.administrativeFeesTTC)}
                      </td>
                    </tr>
                    <tr className="bg-blue-50/50 font-bold text-slate-900 text-sm">
                      <td className="py-3 px-4 text-blue-900">Total Net TTC à Payer</td>
                      <td className="py-3 px-4 text-right text-blue-700 text-base">{formatCurrency(sale.totalSaleTTC)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {sale.notes && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                  <span className="font-bold text-slate-800 block mb-1">Conditions particulières & Engagements :</span>
                  <p>{sale.notes}</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Financing & Payment Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Financement & Encaissements</CardTitle>
            </CardHeader>

            <div className="space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Formule :</span>
                  <span className="font-bold text-slate-900">{sale.financingType}</span>
                </div>
                {sale.financingPartner && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Organisme :</span>
                    <span className="font-semibold text-slate-800">{sale.financingPartner}</span>
                  </div>
                )}
                {sale.durationMonths && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Durée :</span>
                    <span className="font-semibold text-slate-800">{sale.durationMonths} mois</span>
                  </div>
                )}
                {sale.monthlyPayment && (
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                    <span className="text-slate-600 font-semibold">Mensualité estimée :</span>
                    <span className="font-bold text-blue-700 text-sm">{formatCurrency(sale.monthlyPayment)} / mois</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Acompte perçu</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(sale.depositPaidTTC)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Solde restant</span>
                  <span className="font-bold text-slate-900">{formatCurrency(sale.remainingBalanceTTC)}</span>
                </div>
              </div>

              <Button
                variant="primary"
                className="w-full"
                onClick={() => navigate('/deliveries')}
              >
                Voir Planning Livraison
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
