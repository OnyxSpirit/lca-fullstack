import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, Circle, FileCheck, Printer } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDeliveryChecklist, useDeliveryDetailQuery, useSignDelivery } from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { useUiStore } from '../../stores/uiStore';
import { formatDate } from '../../lib/utils';
import { openBusinessPdf } from '../../services/businessPdf';

export const DeliveryDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const deliveryQuery = useDeliveryDetailQuery(id);
  const checklistMutation = useDeliveryChecklist();
  const signMutation = useSignDelivery();
  const [signerName, setSignerName] = useState('');
  const [mileage, setMileage] = useState('');
  const [accepted, setAccepted] = useState(false);
  const delivery = deliveryQuery.data;

  if (deliveryQuery.isLoading) return <div className="p-8 text-sm text-slate-500">Chargement de la livraison…</div>;
  if (deliveryQuery.isError || !delivery) return <div className="p-8"><p className="text-sm text-red-700">{deliveryQuery.error instanceof Error ? deliveryQuery.error.message : 'Livraison introuvable.'}</p><Button className="mt-4" variant="outline" onClick={() => navigate('/deliveries')}>Retour</Button></div>;

  const checklist = Array.isArray(delivery.checklist) ? delivery.checklist : [];
  const ready = checklist.length > 0 && checklist.filter((item: any) => Boolean(item.is_required)).every((item: any) => Boolean(item.is_completed));
  const delivered = delivery.status === 'delivered';

  const updateItem = async (item: any) => {
    try {
      await checklistMutation.mutateAsync({ deliveryId: id, itemId: String(item.id), completed: !Boolean(item.is_completed) });
    } catch (error) {
      addToast({ type: 'error', title: 'Mise à jour impossible', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };

  const sign = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || !accepted || !signerName.trim()) return;
    try {
      await signMutation.mutateAsync({ deliveryId: id, signerName: signerName.trim(), signatureData: `ACCEPTED:${signerName.trim()}`, mileageAtDelivery: mileage ? Number(mileage) : undefined });
      addToast({ type: 'success', title: 'Livraison signée', description: 'Le véhicule et la vente ont été marqués comme livrés.' });
    } catch (error) {
      addToast({ type: 'error', title: 'Signature impossible', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };

  return <div className="space-y-6">
    <PageHeader title={`Livraison ${delivery.delivery_number}`} subtitle={`${delivery.customer_name} · ${delivery.vehicle_label}`} breadcrumbs={[{ label: 'Livraisons', href: '/deliveries' }, { label: delivery.delivery_number }]} actions={<div className="flex gap-2"><Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/deliveries')}>Retour</Button>{delivered && <Button size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => openBusinessPdf('delivery',String(id)).catch(error=>addToast({type:'error',title:'PDF indisponible',description:error.message}))}>Imprimer le PV</Button>}</div>} />

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card className="lg:col-span-2">
        <CardHeader><CardTitle>Checklist de préparation</CardTitle><Badge variant={delivered || ready ? 'success' : 'warning'}>{delivered ? 'Livrée' : ready ? 'Prête' : 'En préparation'}</Badge></CardHeader>
        <div className="divide-y divide-slate-100">
          {checklist.map((item: any) => <button key={item.id} type="button" disabled={delivered || checklistMutation.isPending} onClick={() => updateItem(item)} className="w-full flex items-center justify-between py-3 text-left disabled:cursor-default">
            <span className="flex items-center gap-3 text-sm font-medium text-slate-800">{item.is_completed ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Circle className="w-5 h-5 text-slate-300" />}{item.item_name}</span>
            <span className="text-xs text-slate-500">{item.is_completed ? `Validé${item.completed_at ? ` le ${formatDate(item.completed_at)}` : ''}` : 'À contrôler'}</span>
          </button>)}
          {!checklist.length && <p className="py-6 text-sm text-slate-500">Aucun élément de contrôle n’est configuré.</p>}
        </div>
      </Card>

      <div className="space-y-5">
        <Card><CardHeader><CardTitle>Rendez-vous</CardTitle></CardHeader><dl className="space-y-3 text-sm"><div><dt className="text-slate-500">Date</dt><dd className="font-semibold">{formatDate(delivery.scheduled_at)}</dd></div><div><dt className="text-slate-500">Client</dt><dd className="font-semibold">{delivery.customer_name}</dd><dd className="text-slate-600">{delivery.phone || '—'}</dd></div><div><dt className="text-slate-500">Véhicule</dt><dd className="font-semibold">{delivery.vehicle_label}</dd><dd className="font-mono text-xs">VIN {delivery.vin || '—'}</dd></div></dl></Card>
        {!delivered && <Card><CardHeader><CardTitle>Signature de remise</CardTitle></CardHeader><form className="space-y-3" onSubmit={sign}><label className="block text-xs font-semibold text-slate-700">Nom du signataire<input required value={signerName} onChange={e => setSignerName(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label><label className="block text-xs font-semibold text-slate-700">Kilométrage à la livraison<input type="number" min="0" value={mileage} onChange={e => setMileage(e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm" /></label><label className="flex gap-2 text-xs text-slate-600"><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} />Le client confirme la réception du véhicule et des documents.</label><Button type="submit" className="w-full" icon={<FileCheck className="w-4 h-4" />} disabled={!ready || !accepted || !signerName.trim()} loading={signMutation.isPending}>Signer et livrer</Button>{!ready && <p className="text-xs text-amber-700">Tous les contrôles obligatoires doivent être validés.</p>}</form></Card>}
      </div>
    </div>
  </div>;
};
