import React, { useEffect, useState } from 'react';
import { useCreateInvoice, useCustomersQuery } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { InvoiceType } from '../../types';
import { formatCurrency } from '../../lib/utils';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewInvoiceModal: React.FC<NewInvoiceModalProps> = ({ isOpen, onClose }) => {
  const customers=useCustomersQuery().data??[]; const createInvoice=useCreateInvoice(); const agency=useAuthStore((s)=>s.currentAgency);
  const { addToast } = useUiStore();

  const [formData, setFormData] = useState({
    customerId: customers[0]?.id || '',
    type: 'FACTURE_ATELIER_SAV' as InvoiceType,
    relatedDocNumber: '',
    amountHT: 450,
    tvaRate: 20,
    paymentMethod: 'Carte Bancaire' as const,
  });

  const amountTVA = (formData.amountHT * formData.tvaRate) / 100;
  const amountTTC = formData.amountHT + amountTVA;
  useEffect(() => { if (!formData.customerId && customers[0]) setFormData(current => ({...current, customerId: customers[0].id})); }, [customers, formData.customerId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const customer = customers.find((c) => c.id === formData.customerId);
    const today = new Date().toISOString().split('T')[0];
    const dueDate = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    try { await createInvoice.mutateAsync({
      invoiceType: formData.type==='FACTURE_VENTE_VN_VO'?'vehicle':formData.type==='FACTURE_ATELIER_SAV'?'workshop':'parts',
      customerId: formData.customerId,
      agencyId: agency?.id,
      issueDate: today,
      dueDate,
      notes: `Référence: ${formData.relatedDocNumber}`,
      items: [{description:formData.relatedDocNumber,quantity:1,unitPrice:formData.amountHT,taxRate:formData.tvaRate}],
    });

    addToast({
      type: 'success',
      title: 'Facture émise avec succès',
      description: `Facture de ${formatCurrency(amountTTC)} TTC générée et prête pour encaissement.`,
    });

    onClose(); } catch (error) { addToast({type:'error',title:'Facture non créée',description:error instanceof Error?error.message:'Erreur API'}); }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Émettre une Facture Concession"
      description="Génération de facture pour vente VN/VO, réparation atelier SAV ou pièces de rechange."
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Client à facturer</label>
          <select
            value={formData.customerId}
            onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
            className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.civility} {c.firstName} {c.lastName} {c.company && `(${c.company})`}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Type de facture</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
            >
              <option value="FACTURE_ATELIER_SAV">Facture Atelier SAV</option>
              <option value="FACTURE_VENTE_VN_VO">Facture Vente Véhicule</option>
              <option value="FACTURE_PIECES">Facture Pièces & Accessoires</option>
              <option value="ACOMPTE">Facture d'Acompte</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Document de référence</label>
            <input
              type="text"
              value={formData.relatedDocNumber}
              onChange={(e) => setFormData({ ...formData, relatedDocNumber: e.target.value })}
              placeholder="ex: OR-2026-1026, V-2026-0045"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Montant Total HT (FCFA)</label>
            <input
              type="number"
              step="10"
              required
              value={formData.amountHT}
              onChange={(e) => setFormData({ ...formData, amountHT: Number(e.target.value) })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Mode de règlement prévu</label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
            >
              <option value="Carte Bancaire">Carte Bancaire</option>
              <option value="Virement">Virement Bancaire</option>
              <option value="Chèque de Banque">Chèque de Banque</option>
              <option value="Prélèvement / Financement">Financement / LLD</option>
              <option value="Espèces">Espèces</option>
            </select>
          </div>
        </div>

        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Montant HT :</span>
            <span>{formatCurrency(formData.amountHT)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>TVA (20%) :</span>
            <span>{formatCurrency(amountTVA)}</span>
          </div>
          <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200 text-sm">
            <span>Total TTC :</span>
            <span className="text-blue-700">{formatCurrency(amountTTC)}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose}>
            Annuler
          </Button>
          <Button variant="primary" type="submit" loading={createInvoice.isPending} disabled={!formData.customerId || !agency?.id}>
            Valider et Émettre
          </Button>
        </div>
      </form>
    </Modal>
  );
};
