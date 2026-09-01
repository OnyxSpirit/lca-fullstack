import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Calendar,
  Clock,
  Car,
  User,
  CheckCircle2,
  FileCheck,
  Printer,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { useDeliveriesQuery } from '../../api/erpHooks';
import { NewDeliveryModal } from './NewDeliveryModal';
import { openBusinessPdf } from '../../services/businessPdf';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';

export const DeliveriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = React.useState(false);
  const addToast=useUiStore(s=>s.addToast);
  const deliveries = useDeliveriesQuery().data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Planning des Livraisons & Mises en Main"
        subtitle="Organisation des rendez-vous de livraison, préparation esthétique et procès-verbaux de mise à la route."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Commercial' }, { label: 'Livraisons' }]}
        actions={
          <div className="flex gap-2"><Button size="sm" onClick={() => setNewOpen(true)}>Planifier une livraison</Button><Button
            variant="outline"
            size="sm"
            icon={<Printer className="w-4 h-4" />}
            onClick={() => window.print()}
          >
            Imprimer Planning Jour
          </Button></div>
        }
      />

      {/* Grid of Planned Deliveries */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {deliveries.map((del) => (
          <Card
            key={del.id}
            className={`flex flex-col justify-between ${
              del.status === 'LIVRE_SIGNE' ? 'border-emerald-200 bg-emerald-50/20' : 'border-blue-200'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant={del.status === 'LIVRE_SIGNE' ? 'success' : 'primary'} size="sm">
                    {del.status === 'LIVRE_SIGNE' ? 'Livré au client' : 'Rendez-vous'}
                  </Badge>
                  <div className="text-sm font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-600" />
                    {formatDate(del.deliveryDate)} {del.deliveryTimeSlot}
                  </div>
                </div>
                <span className="font-mono text-xs text-slate-400 font-semibold">{del.saleNumber}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                <div className="font-bold text-slate-900 text-sm">{del.customerName}</div>
                <div className="text-slate-500">{del.customerPhone}</div>
                <div className="font-semibold text-blue-700 pt-1 border-t border-slate-200/60">
                  {del.vehicleLabel}
                </div>
                <div className="font-mono text-[11px] text-slate-500">Immat : {del.vehiclePlate || '—'}</div>
              </div>

              {/* Checklist */}
              <div className="space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Checklist Préparation Concession
                </span>
                <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${del.checklist.aestheticCheck ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Prépa esthétique</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${del.checklist.accessoriesFitted ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Plaques posées</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${del.checklist.customerHandoverBriefing ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Double des clés</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${del.checklist.documentsComplete ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Dossier complet</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Conseiller : {del.salesRepName?.split(' ')[0] || '—'}</span>
              {del.status !== 'LIVRE_SIGNE' ? (
                <Button
                  size="xs"
                  variant="success"
                  icon={<FileCheck className="w-3.5 h-3.5" />}
                  onClick={() => navigate(`/deliveries/${del.id}`)}
                >
                  Ouvrir la livraison
                </Button>
              ) : (
                <Button size="xs" variant="outline" onClick={() => openBusinessPdf('delivery',del.id).catch(error=>addToast({type:'error',title:'PDF indisponible',description:error.message}))}>
                  Voir PV Signé
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <NewDeliveryModal isOpen={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
};
