import React, { useState } from 'react';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  DollarSign,
  Download,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  FileText,
  Send,
  Calendar,
} from 'lucide-react';
import { useInvoicePayment, useInvoicesQuery, usePaymentMethodsQuery } from '../../api/erpHooks';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Invoice, PaymentMethod } from '../../types';
import { apiDownload } from '../../services/apiClient';
import { NewInvoiceModal } from './NewInvoiceModal';
import { downloadInvoicePdf, printInvoicePdf } from '../../services/invoicePdf';

export const BillingPage: React.FC = () => {
  const invoices = useInvoicesQuery().data ?? [];
  const paymentMethods = usePaymentMethodsQuery().data ?? []; const invoicePayment = useInvoicePayment();
  const { addToast } = useUiStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [isNewInvoiceOpen, setIsNewInvoiceOpen] = useState(false);

  // Payment registration modal
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Carte Bancaire');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.relatedDocNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = selectedStatus === 'ALL' || inv.status === selectedStatus;
    const matchesType = selectedType === 'ALL' || inv.type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const totalBilled = invoices.reduce((sum, inv) => sum + inv.amountTTC, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.paidAmountTTC, 0);
  const totalDue = invoices.reduce((sum, inv) => sum + inv.remainingAmountTTC, 0);
  const exportAccounting=async()=>{try{const blob=await apiDownload('/invoices/export/accounting');const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`journal-comptable-${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);addToast({type:'success',title:'Export comptable généré',description:'Le journal provient des factures enregistrées dans MySQL.'})}catch(error){addToast({type:'error',title:'Export impossible',description:error instanceof Error?error.message:'Erreur API'})}};

  const handleOpenPayment = (inv: Invoice) => {
    setPayingInvoice(inv);
    setPaymentAmount(inv.remainingAmountTTC);
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingInvoice || paymentAmount <= 0) return;

    const selected = paymentMethods.find((method) => method.name.toLowerCase().includes(paymentMethod.split(' ')[0].toLowerCase())) ?? paymentMethods[0];
    if (!selected) { addToast({ type: 'error', title: 'Configuration manquante', description: 'Aucun moyen de paiement actif.' }); return; }
    try {
      await invoicePayment.mutateAsync({ invoiceId: payingInvoice.id, paymentMethodId: String(selected.id), amount: paymentAmount });
      addToast({
        type: 'success',
        title: 'Règlement enregistré',
        description: `Paiement de ${formatCurrency(paymentAmount)} par ${paymentMethod} validé pour la facture ${payingInvoice.invoiceNumber}.`,
      });
      setPayingInvoice(null);
    } catch (error) {
      addToast({ type: 'error', title: 'Paiement impossible', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Facturation, Encaissements & Règlements"
        subtitle="Gestion des factures VN/VO, ateliers SAV, magasin pièces et suivi des créances clients."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Finances' }, { label: 'Facturation' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={exportAccounting}
            >
              Export FEC / Compta
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewInvoiceOpen(true)}
            >
              Créer Facture
            </Button>
          </div>
        }
      />

      {/* KPI Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Chiffre d'Affaires Facturé</span>
            <div className="text-xl font-bold text-blue-700 mt-0.5">
              {formatCurrency(totalBilled)}
            </div>
          </div>
          <Badge variant="primary" size="md">{invoices.length} factures</Badge>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Total Encaissé</span>
            <div className="text-xl font-bold text-emerald-600 mt-0.5">
              {formatCurrency(totalPaid)}
            </div>
          </div>
          <Badge variant="success" size="md">Perçu</Badge>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-medium">Encours & Reste à Percevoir</span>
            <div className="text-xl font-bold text-rose-600 mt-0.5">
              {formatCurrency(totalDue)}
            </div>
          </div>
          <Badge variant={totalDue > 0 ? 'danger' : 'success'} size="md">
            {totalDue > 0 ? 'Créances' : 'À jour'}
          </Badge>
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
            placeholder="Rechercher par n° facture, client, document lié..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Tous types de factures</option>
            <option value="FACTURE_VENTE_VN_VO">Vente Véhicule VN/VO</option>
            <option value="FACTURE_ATELIER_SAV">Atelier SAV</option>
            <option value="FACTURE_PIECES">Comptoir Pièces PR</option>
            <option value="AVOIR">Avoirs</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Tous statuts</option>
            <option value="VALIDEE">En attente règlement</option>
            <option value="PAYEE">Payée intégralement</option>
            <option value="EN_RETARD">En retard</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">N° Facture & Date</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Type & Document Lié</th>
                <th className="py-3 px-4">Montant HT</th>
                <th className="py-3 px-4">Montant TTC</th>
                <th className="py-3 px-4">Reste Dû</th>
                <th className="py-3 px-4">Statut</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                    <div className="text-[10px] text-slate-400">{inv.issueDate}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800">{inv.customerName}</td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-700">
                      {inv.type === 'FACTURE_VENTE_VN_VO'
                        ? 'Vente Véhicule'
                        : inv.type === 'FACTURE_ATELIER_SAV'
                        ? 'Atelier SAV'
                        : 'Magasin PR'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">{inv.relatedDocNumber}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{formatCurrency(inv.amountHT)}</td>
                  <td className="py-3 px-4 font-bold text-slate-900">{formatCurrency(inv.amountTTC)}</td>
                  <td className="py-3 px-4">
                    {inv.remainingAmountTTC > 0 ? (
                      <span className="font-bold text-rose-600">{formatCurrency(inv.remainingAmountTTC)}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">Réglé</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={inv.status} type="invoice" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {inv.remainingAmountTTC > 0 && (
                        <Button
                          size="xs"
                          variant="primary"
                          icon={<CreditCard className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenPayment(inv)}
                        >
                          Encaisser
                        </Button>
                      )}
                      <Button
                        size="xs"
                        variant="outline"
                        icon={<FileText className="w-3.5 h-3.5" />}
                        onClick={() => printInvoicePdf(inv.id).catch((error) => addToast({ type: 'error', title: 'PDF indisponible', description: error.message }))}
                      >
                        Imprimer
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        icon={<Download className="w-3.5 h-3.5" />}
                        onClick={() => downloadInvoicePdf(inv.id, inv.invoiceNumber).catch((error) => addToast({ type: 'error', title: 'Téléchargement impossible', description: error.message }))}
                      >
                        PDF
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Invoice Modal */}
      <NewInvoiceModal
        isOpen={isNewInvoiceOpen}
        onClose={() => setIsNewInvoiceOpen(false)}
      />

      {/* Register Payment Modal */}
      {payingInvoice && (
        <Modal
          isOpen={true}
          onClose={() => setPayingInvoice(null)}
          title={`Enregistrer un Règlement : ${payingInvoice.invoiceNumber}`}
          description={`Client : ${payingInvoice.customerName} • Reste dû : ${formatCurrency(payingInvoice.remainingAmountTTC)}`}
          maxWidth="md"
        >
          <form onSubmit={handleConfirmPayment} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Montant à Encaisser (FCFA TTC) *</label>
              <input
                type="number"
                required
                max={payingInvoice.remainingAmountTTC}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-sm font-bold p-2.5 rounded-lg border border-slate-300 bg-white text-blue-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Moyen de Paiement *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Carte Bancaire">Carte Bancaire (TPE)</option>
                <option value="Virement Bancaire">Virement Bancaire</option>
                <option value="Financement">Financement (Organisme Partenaire)</option>
                <option value="Chèque">Chèque Bancaire</option>
                <option value="Espèces">Espèces (dans la limite légale)</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button variant="outline" type="button" onClick={() => setPayingInvoice(null)}>
                Annuler
              </Button>
              <Button variant="primary" type="submit" icon={<CheckCircle2 className="w-4 h-4" />}>
                Valider l'Encaissement
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
