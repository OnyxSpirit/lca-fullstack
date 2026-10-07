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
  AlertTriangle,
} from 'lucide-react';
import { useDeliveryFinancialAuthorizations, useInvoiceQuery, useSaleDetailQuery, useSaleStatusMutation, useUpdateSale, useUpdateSaleWarranty } from '../../api/erpHooks';
import { saleStatusToDb } from '../../services/mysqlStatusMap';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../../lib/utils';
import { openBusinessPdf } from '../../services/businessPdf';
import { useAuthStore } from '../../stores/authStore';
import {DeliveryFinancialAuthorizationPanel} from '../deliveries/DeliveryFinancialAuthorizationPanel';

export const SaleDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const salesQuery = useSaleDetailQuery(id); const saleStatus = useSaleStatusMutation(); const updateSale=useUpdateSale(); const updateWarranty=useUpdateSaleWarranty();
  const agencyId=useAuthStore(s=>s.currentAgency?.id),can=useAuthStore(s=>s.can),canViewInvoice=can('billing.invoice.view'),canViewPayments=can('billing.payment.view'),canPay=can('billing.payment.collect'),canCreateInvoice=can('billing.invoice.create'),canUpdateSale=can('sales.update'),canCancelSale=can('sales.cancel'),canViewDelivery=can('delivery.view'),canPlanDelivery=can('delivery.prepare'),canConfirm=can('sales.confirm');
  const { addToast } = useUiStore();

  const sale = salesQuery.data;
  const invoiceQuery=useInvoiceQuery(sale?.invoiceId,agencyId,canViewInvoice),invoice=invoiceQuery.data,authorizationQuery=useDeliveryFinancialAuthorizations(id,canViewDelivery||can('delivery.financial_override.authorize'));

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

  const handleStatusChange = async (newStatus: keyof typeof saleStatusToDb, reason?:string) => {
    const status = saleStatusToDb[newStatus];
    if (!status) { addToast({type:'error',title:'Transition impossible',description:'Statut backend non défini.'}); return; }
    try {
      await saleStatus.mutateAsync({ id: sale.id, status, reason });
      addToast({ type: 'success', title: 'Statut du dossier mis à jour', description: `Le dossier est maintenant : ${newStatus}.` });
    } catch (error) {
      const description=error instanceof Error?error.message:'Erreur API',regularizationRequired=status==='cancelled'&&/paiement|encaiss/i.test(description);
      addToast({ type: 'error', title: regularizationRequired?'Régularisation financière requise':'Transition impossible', description });
    }
  };

  const nextStatus: Partial<Record<typeof sale.status, keyof typeof saleStatusToDb>> = {
    RESERVATION: 'COMMANDE', COMMANDE: 'FINANCEMENT_VALIDE', FINANCEMENT_VALIDE: 'PREPARATION', PREPARATION: 'PRET_LIVRAISON',
  };
  const nextLabel: Record<string, string> = { COMMANDE: 'Confirmer la commande', FINANCEMENT_VALIDE: 'Confirmer la vente', PREPARATION: 'Lancer la préparation', PRET_LIVRAISON: 'Déclarer prêt à livrer' };
  const next=nextStatus[sale.status],isFinancialTransition=next==='PREPARATION'||next==='PRET_LIVRAISON';
  const currentBalance=Number(invoice?.remainingAmountTTC??sale.remainingBalanceTTC),activeAuthorization=authorizationQuery.data?.find((row:any)=>row.status==='AUTHORIZED'),authorizationValid=Boolean(activeAuthorization&&currentBalance>0&&currentBalance<=Number(activeAuthorization.balance_due_snapshot)+.001),financialBlocked=isFinancialTransition&&!sale.financiallyCleared&&!authorizationValid;
  const financialBlockReason=invoice?`Préparation impossible — solde restant : ${formatCurrency(invoice.remainingAmountTTC)}`:'Une facture émise et intégralement réglée est requise.';
  const netCollected=Number(invoice?.paidAmountTTC??0),financialRegularizationRequired=netCollected>0,refundedAmount=(invoice?.payments??[]).reduce((sum,payment)=>sum+payment.refundedAmount,0),cancellationBlocked=financialRegularizationRequired||['PRET_LIVRAISON','LIVRE'].includes(sale.status);
  const warrantyLabel={UNDETERMINED:'Décision à renseigner',NOT_APPLICABLE:'Garantie non applicable',APPLICABLE:'Garantie applicable'}[sale.warranty.decision];
  const editWarranty=async()=>{const applicable=window.confirm('OK : garantie applicable. Annuler : garantie non applicable.');try{if(!applicable){await updateWarranty.mutateAsync({id:sale.id,decision:'NOT_APPLICABLE'});return}const months=Number(window.prompt('Durée contractuelle en mois',String(sale.warranty.durationMonths??24)));if(!Number.isInteger(months)||months<1||months>240)return;const mileageText=window.prompt('Plafond kilométrique (vide si aucun)',sale.warranty.mileageLimit==null?'':String(sale.warranty.mileageLimit));await updateWarranty.mutateAsync({id:sale.id,decision:'APPLICABLE',durationMonths:months,mileageLimit:mileageText?Number(mileageText):null})}catch(error){addToast({type:'error',title:'Garantie non modifiée',description:error instanceof Error?error.message:'Erreur API'})}};

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
            {canUpdateSale&&['DEVIS','RESERVATION'].includes(sale.status)&&<Button variant="outline" size="sm" onClick={()=>{const notes=window.prompt('Notes de la vente',sale.notes??'');if(notes!==null)void updateSale.mutateAsync({id:sale.id,notes}).catch(error=>addToast({type:'error',title:'Modification impossible',description:error instanceof Error?error.message:'Erreur API'}))}}>Modifier les notes</Button>}
            <Button
              variant="outline"
              size="sm"
              icon={<Printer className="w-4 h-4" />}
              onClick={() => openBusinessPdf('sale',sale.id).catch(error=>addToast({type:'error',title:'PDF indisponible',description:error.message}))}
            >
              Imprimer Bon de Commande
            </Button>

            {next&&canConfirm&&<div title={financialBlocked?financialBlockReason:undefined}><Button variant="primary" size="sm" loading={saleStatus.isPending} disabled={financialBlocked} icon={<CheckCircle2 className="w-4 h-4" />} onClick={() => handleStatusChange(next)}>{nextLabel[next]}</Button></div>}
            {sale.status === 'PRET_LIVRAISON'&&canPlanDelivery&&<Button variant="success" size="sm" icon={<Truck className="w-4 h-4" />} onClick={() => navigate(`/deliveries?saleId=${encodeURIComponent(sale.id)}`)}>Planifier la livraison</Button>}
            {canCancelSale&&!['LIVRE','ANNULE'].includes(sale.status)&&<div title={cancellationBlocked?'Une vente encaissée ou engagée en livraison ne peut plus être annulée.':undefined}><Button variant="danger" size="sm" loading={saleStatus.isPending} disabled={cancellationBlocked} onClick={()=>{const reason=window.prompt("Motif obligatoire d’annulation");if(reason?.trim())void handleStatusChange('ANNULE',reason.trim())}}>Annuler la vente</Button></div>}
          </div>
        }
      />

      {canCancelSale&&financialRegularizationRequired&&<Card><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"/><div><h2 className="font-bold text-amber-900">Régularisation financière requise</h2><p className="mt-1 text-sm text-slate-700">Cette vente a reçu des encaissements et ne peut pas être annulée tant que les sommes encaissées n’ont pas été remboursées.</p><dl className="mt-3 grid gap-x-6 gap-y-2 text-xs sm:grid-cols-2"><div><dt className="text-slate-500">Total facture</dt><dd className="font-semibold">{formatCurrency(invoice?.amountTTC??sale.totalSaleTTC)}</dd></div><div><dt className="text-slate-500">Encaissement net</dt><dd className="font-semibold">{formatCurrency(netCollected)}</dd></div><div><dt className="text-slate-500">Reste dû</dt><dd className="font-semibold">{formatCurrency(invoice?.remainingAmountTTC??sale.remainingBalanceTTC)}</dd></div>{canViewPayments&&<div><dt className="text-slate-500">Déjà remboursé</dt><dd className="font-semibold">{formatCurrency(refundedAmount)}</dd></div>}<div><dt className="text-slate-500">Reste à régulariser</dt><dd className="font-semibold text-amber-800">{formatCurrency(netCollected)}</dd></div></dl><ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-slate-600"><li>Créer l’avoir nécessaire sur la facture.</li><li>Rembourser les sommes encaissées.</li><li>Revenir sur cette vente et relancer l’annulation.</li></ol></div></div>{canViewInvoice&&invoice&&<Button variant="outline" size="sm" onClick={()=>navigate(`/billing/${invoice.id}`)}>Accéder à la facture</Button>}</div></Card>}

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
                  <div className="font-bold text-slate-900 text-sm">{sale.agencyName || 'Concession'}</div>
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
          <DeliveryFinancialAuthorizationPanel saleId={sale.id} total={Number(invoice?.amountTTC??sale.totalSaleTTC)} paid={Number(invoice?.paidAmountTTC??sale.depositPaidTTC)} balance={currentBalance}/>
        </div>

        {/* Right Column: Financing & Payment Status */}
        <div className="space-y-6">
          <Card><CardHeader><CardTitle>Garantie contractuelle</CardTitle>{canUpdateSale&&sale.warranty.status!=='ACTIVE'&&!['LIVRE','ANNULE'].includes(sale.status)&&<Button size="xs" variant="outline" loading={updateWarranty.isPending} onClick={()=>void editWarranty()}>Modifier</Button>}</CardHeader><div className="space-y-2 text-xs"><p className="font-bold">{warrantyLabel}</p>{sale.warranty.decision==='APPLICABLE'&&<><p>Constructeur : <b>{sale.warranty.providerName}</b></p><p>Durée : <b>{sale.warranty.durationMonths} mois</b></p><p>Plafond : <b>{sale.warranty.mileageLimit==null?'Sans plafond contractuel':`${sale.warranty.mileageLimit.toLocaleString('fr-FR')} km`}</b></p><p>État : <b>{sale.warranty.status==='ACTIVE'?'Active':'En attente de livraison'}</b></p>{sale.warranty.status==='ACTIVE'&&<p>Validité : <b>{formatDate(sale.warranty.startDate)} au {formatDate(sale.warranty.expiryDate)}</b></p>}</>}</div></Card>
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

              {canViewPayments&&<div className="space-y-2 pt-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Total encaissé</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(sale.depositPaidTTC)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Solde restant</span>
                  <span className="font-bold text-slate-900">{formatCurrency(sale.remainingBalanceTTC)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Situation financière</span>
                  <Badge variant={sale.remainingBalanceTTC<=0?'success':sale.depositPaidTTC>0?'warning':'default'}>{sale.remainingBalanceTTC<=0?'Soldée':sale.depositPaidTTC>0?'Partiellement payée':'Non réglée'}</Badge>
                </div>
              </div>}

              {canViewPayments&&(invoice?.payments?.length?<div className="rounded-xl border border-slate-200 p-3"><p className="mb-2 font-bold text-slate-800">Historique des règlements</p><div className="space-y-2">{invoice.payments.map(payment=><div key={payment.id} className="flex items-start justify-between gap-3 border-t border-slate-100 pt-2"><div><p className="font-mono font-semibold">{payment.paymentNumber}</p><p className="text-[11px] text-slate-500">{formatDateTime(payment.paymentDate)} · {payment.paymentMethod}{payment.reference?` · ${payment.reference}`:''}</p></div><span className="font-bold text-emerald-700">{formatCurrency(payment.amount)}</span></div>)}</div></div>:sale.invoiceId&&!invoiceQuery.isLoading?<p className="text-[11px] text-slate-500">Aucun règlement validé sur cette facture.</p>:null)}

              {canViewDelivery&&sale.status!=='ANNULE'&&<Button
                variant="primary"
                className="w-full"
                onClick={() => navigate(`/deliveries?saleId=${encodeURIComponent(sale.id)}`)}
              >
                Voir Planning Livraison
              </Button>}
              {sale.invoiceId&&canViewInvoice&&<Button variant={canPay&&sale.remainingBalanceTTC>0?'primary':'outline'} className="w-full" onClick={()=>navigate(`/billing/${sale.invoiceId}`)}>{canPay&&sale.remainingBalanceTTC>0?'Enregistrer un règlement':'Voir la facture et les règlements'}</Button>}
              {sale.invoiceId&&canViewInvoice&&!canPay&&sale.remainingBalanceTTC>0&&<p className="text-[11px] text-slate-500">L’encaissement doit être effectué par la comptabilité.</p>}
              {!sale.invoiceId&&canCreateInvoice&&sale.status!=='ANNULE'&&<Button variant="outline" className="w-full" onClick={()=>navigate(`/billing?saleId=${encodeURIComponent(sale.id)}`)}>Créer la facture de vente</Button>}
              {!sale.invoiceId&&<p className="text-[11px] text-amber-700">Aucune facture de vente n’est encore liée. L’encaissement est réservé à un rôle financier autorisé et commence après émission de la facture.</p>}
              {sale.invoiceId&&!canPay&&sale.remainingBalanceTTC>0&&<p className="text-[11px] text-slate-500">Un solde reste dû. Son encaissement doit être effectué par la comptabilité ou un rôle financier autorisé.</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
