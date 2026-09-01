import React, { useEffect, useState } from 'react';
import { useCreateDelivery, useSalesQuery } from '../../api/erpHooks';
import { Modal } from '../../components/ui/Modal';
import { Button } from '../../components/ui/Button';
import { useUiStore } from '../../stores/uiStore';

export const NewDeliveryModal: React.FC<{isOpen:boolean;onClose:()=>void}> = ({ isOpen, onClose }) => {
  const sales = (useSalesQuery().data ?? []).filter(s => s.status === 'PRET_LIVRAISON');
  const create = useCreateDelivery();
  const { addToast } = useUiStore();
  const [saleId, setSaleId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  useEffect(() => { if (!saleId && sales[0]) setSaleId(sales[0].id); }, [saleId, sales]);
  const submit = async (event: React.FormEvent) => { event.preventDefault(); try { await create.mutateAsync({ saleId, scheduledAt: new Date(scheduledAt).toISOString(), customerNotes: notes || undefined }); addToast({type:'success',title:'Livraison planifiée',description:'La checklist de préparation a été créée.'}); onClose(); } catch (error) { addToast({type:'error',title:'Planification impossible',description:error instanceof Error?error.message:'Erreur API'}); } };
  return <Modal isOpen={isOpen} onClose={onClose} title="Planifier une livraison" description="Seules les ventes déclarées prêtes à livrer sont proposées." maxWidth="md"><form onSubmit={submit} className="space-y-4"><label className="block text-xs font-semibold text-slate-700">Vente prête<select required value={saleId} onChange={e=>setSaleId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm"><option value="">Sélectionner…</option>{sales.map(s=><option key={s.id} value={s.id}>{s.saleNumber} — {s.customerName} — {s.vehicleLabel}</option>)}</select></label><label className="block text-xs font-semibold text-slate-700">Date et heure<input required type="datetime-local" value={scheduledAt} onChange={e=>setScheduledAt(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">Notes client<textarea value={notes} onChange={e=>setNotes(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 p-2.5 text-sm" rows={3}/></label>{!sales.length&&<p className="text-xs text-amber-700">Aucune vente n’est actuellement au statut « prête à livrer ».</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Annuler</Button><Button type="submit" disabled={!saleId || !scheduledAt} loading={create.isPending}>Planifier</Button></div></form></Modal>;
};
