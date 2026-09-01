import React, { useState } from 'react';
import {
  Compass,
  Plus,
  Users,
  Clock,
  Car,
  UserCheck,
  CheckCircle2,
  Phone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useCreateShowroomVisit, useShowroomQuery, useShowroomStatus } from '../../api/erpHooks';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ShowroomVisitor } from '../../types';

export const ShowroomPage: React.FC = () => {
  const showroomVisitors=useShowroomQuery().data??[]; const createVisit=useCreateShowroomVisit(); const showroomStatus=useShowroomStatus();
  const { currentUser, currentAgency } = useAuthStore();
  const { addToast, setActiveQuickActionModal } = useUiStore();

  const [isNewVisitorOpen, setIsNewVisitorOpen] = useState(false);
  const [visitorForm, setVisitorForm] = useState({
    visitorName: '',
    phone: '',
    interest: 'Achat Occasion' as ShowroomVisitor['interest'],
    preferredModel: 'BMW X3 ou équivalent',
  });

  const waitingVisitors = showroomVisitors.filter((v) => v.status === 'En Attente');
  const inProgressVisitors = showroomVisitors.filter((v) => v.status === 'En Entretien' || v.status === 'En Essai');
  const completedVisitors = showroomVisitors.filter((v) => v.status === 'Terminé');

  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorForm.visitorName) return;

    try{await createVisit.mutateAsync({ visitorName: visitorForm.visitorName, phone: visitorForm.phone, reason: visitorForm.interest, assignedUserId: currentUser?.id, agencyId: currentAgency?.id });addToast({
      type: 'success',
      title: 'Visiteur enregistré à l’accueil',
      description: `${visitorForm.visitorName} a été ajouté à la file d’attente showroom.`,
    });

    setVisitorForm({
      visitorName: '',
      phone: '',
      interest: 'Achat Occasion',
      preferredModel: '',
    });
    setIsNewVisitorOpen(false);}catch(error){addToast({type:'error',title:'Enregistrement impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  const handleTakeOver = async (visitorId: string) => {
    try{await showroomStatus.mutateAsync({id:visitorId,status:'in_progress'});addToast({
      type: 'info',
      title: 'Prise en charge validée',
      description: `Vous avez pris en charge ce visiteur. Bon échange commercial !`,
    });}catch(error){addToast({type:'error',title:'Action impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  const handleStartTestDrive = async (visitorId: string) => {
    try{await showroomStatus.mutateAsync({id:visitorId,status:'in_progress'});addToast({
      type: 'warning',
      title: 'Départ en Essai Routier',
      description: 'Véhicule de démonstration mis à disposition. Fiche d’essai enregistrée.',
    });}catch(error){addToast({type:'error',title:'Action impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  const handleComplete = async (visitorId: string) => {
    try{await showroomStatus.mutateAsync({id:visitorId,status:'completed'});addToast({
      type: 'success',
      title: 'Visite clôturée',
      description: 'Vous pouvez maintenant créer une opportunité CRM ou un bon de commande.',
    });}catch(error){addToast({type:'error',title:'Clôture impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestion de l'Accueil & File d'Attente Showroom"
        subtitle="Suivi des passages en concession, attribution automatique des conseillers et départs en essais routiers."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Commercial' }, { label: 'Showroom & Accueil' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewVisitorOpen(true)}
          >
            Enregistrer un Visiteur
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Visiteurs Aujourd'hui</span>
          <div className="text-2xl font-bold text-slate-900 mt-1">{showroomVisitors.length}</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Taux transfo estimé: 32%</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">En Attente Accueil</span>
          <div className="text-2xl font-bold text-amber-600 mt-1">{waitingVisitors.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Temps d'attente moyen : 4 min</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Entretiens / Essais en Cours</span>
          <div className="text-2xl font-bold text-blue-700 mt-1">{inProgressVisitors.length}</div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 block">4 conseillers mobilisés</span>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs text-slate-500 font-medium">Visites Traitées ce Jour</span>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{completedVisitors.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">5 devis créés</span>
        </div>
      </div>

      {/* Live Floor Board (3 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: WAITING */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-xs text-amber-900 uppercase tracking-wider">
                1. En Attente d'un Conseiller ({waitingVisitors.length})
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {waitingVisitors.map((v) => (
              <Card key={v.id} className="border-l-4 border-l-amber-500 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{v.visitorName}</h4>
                    <span className="text-xs text-slate-500">{v.phone}</span>
                  </div>
                  <Badge variant="warning" size="sm">Attente: {v.waitTimeMinutes} min</Badge>
                </div>

                <div className="text-xs bg-slate-50 p-2.5 rounded-lg space-y-1">
                  <div className="font-semibold text-blue-700">Motif : {v.interest}</div>
                  {v.preferredModel && (
                    <div className="text-slate-600">Véhicule ciblé : {v.preferredModel}</div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">Arrivée : {v.arrivalDateTime}</span>
                  <Button
                    size="xs"
                    variant="primary"
                    icon={<UserCheck className="w-3.5 h-3.5" />}
                    onClick={() => handleTakeOver(v.id)}
                  >
                    Prendre en Charge
                  </Button>
                </div>
              </Card>
            ))}

            {waitingVisitors.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                Aucun visiteur en attente. Le showroom est fluide !
              </div>
            )}
          </div>
        </div>

        {/* Column 2: IN PROGRESS */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-xl border border-blue-200">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="font-bold text-xs text-blue-900 uppercase tracking-wider">
                2. Entretiens & Essais en Cours ({inProgressVisitors.length})
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {inProgressVisitors.map((v) => (
              <Card
                key={v.id}
                className={`border-l-4 ${
                  v.status === 'En Essai' ? 'border-l-purple-500 bg-purple-50/20' : 'border-l-blue-500'
                } space-y-3`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{v.visitorName}</h4>
                    <span className="text-xs text-blue-700 font-semibold">Conseiller : {v.assignedRepName || currentUser.name}</span>
                  </div>
                  <Badge variant={v.status === 'En Essai' ? 'primary' : 'default'} size="sm">
                    {v.status === 'En Essai' ? '🚗 En Essai' : 'En Entretien'}
                  </Badge>
                </div>

                <div className="text-xs bg-slate-50 p-2.5 rounded-lg space-y-1">
                  <div className="font-semibold text-slate-800">Projet : {v.interest}</div>
                  {v.preferredModel && (
                    <div className="text-slate-600">Modèle discuté : {v.preferredModel}</div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                  {v.status !== 'En Essai' && (
                    <Button
                      size="xs"
                      variant="outline"
                      icon={<Car className="w-3.5 h-3.5" />}
                      onClick={() => handleStartTestDrive(v.id)}
                    >
                      Lancer Essai
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="success"
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => handleComplete(v.id)}
                  >
                    Clôturer Visite
                  </Button>
                </div>
              </Card>
            ))}

            {inProgressVisitors.length === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-400">
                Aucun entretien en cours.
              </div>
            )}
          </div>
        </div>

        {/* Column 3: COMPLETED */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-bold text-xs text-emerald-900 uppercase tracking-wider">
                3. Visites Terminées ({completedVisitors.length})
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {completedVisitors.map((v) => (
              <Card key={v.id} className="border-l-4 border-l-emerald-500 space-y-2 opacity-85">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{v.visitorName}</h4>
                    <span className="text-[11px] text-slate-500">Conseiller : {v.assignedRepName || 'Non affecté'}</span>
                  </div>
                  <Badge variant="success" size="sm">Terminé</Badge>
                </div>
                <p className="text-xs text-slate-600">{v.interest} • {v.preferredModel}</p>
                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setActiveQuickActionModal('lead')}
                  >
                    Créer Opportunité CRM →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* New Visitor Modal */}
      <Modal
        isOpen={isNewVisitorOpen}
        onClose={() => setIsNewVisitorOpen(false)}
        title="Enregistrer un Visiteur Showroom"
        description="Accueil physique en concession automobile."
        maxWidth="md"
      >
        <form onSubmit={handleAddVisitor} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Nom et Prénom du Visiteur *</label>
            <input
              type="text"
              required
              value={visitorForm.visitorName}
              onChange={(e) => setVisitorForm({ ...visitorForm, visitorName: e.target.value })}
              placeholder="ex: Laurent Vasseur"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone de contact</label>
            <input
              type="tel"
              value={visitorForm.phone}
              onChange={(e) => setVisitorForm({ ...visitorForm, phone: e.target.value })}
              placeholder="06 12 34 56 78"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Motif de la visite</label>
            <select
              value={visitorForm.interest}
              onChange={(e) => setVisitorForm({ ...visitorForm, interest: e.target.value as any })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            >
              <option value="Achat Véhicule Neuf">Achat Véhicule Neuf (VN)</option>
              <option value="Achat Occasion">Achat Véhicule Occasion (VO)</option>
              <option value="Essai Véhicule">Essai Véhicule / Démonstration</option>
              <option value="Reprise / Estimation">Estimation & Reprise de véhicule</option>
              <option value="SAV / Atelier">Rendez-vous SAV & Entretien Atelier</option>
              <option value="Livraison">Réception & Livraison Véhicule Neuf</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Modèle d'intérêt / Véhicule ciblé</label>
            <input
              type="text"
              value={visitorForm.preferredModel}
              onChange={(e) => setVisitorForm({ ...visitorForm, preferredModel: e.target.value })}
              placeholder="ex: BMW Série 3 Touring ou Peugeot 3008 GT"
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsNewVisitorOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              Ajouter à la file d'attente
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
