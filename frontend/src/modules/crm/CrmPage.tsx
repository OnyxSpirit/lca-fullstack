import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Kanban,
  List,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Car,
  Clock,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useCreateActivity, useLeadStageMutation, useLeadsQuery } from '../../api/erpHooks';
import { opportunityStageToDb } from '../../services/mysqlStatusMap';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Lead, LeadStage } from '../../types';
import { formatCurrency, formatDate } from '../../lib/utils';
import { NewLeadModal } from './NewLeadModal';
import { Modal } from '../../components/ui/Modal';
import { TableEmptyState } from '../../components/common/TableEmptyState';

export const CrmPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('ALL');
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [newInteractionNote, setNewInteractionNote] = useState('');
  const [interactionType, setInteractionType] = useState<'Appel' | 'Email' | 'Visite' | 'Essai'>('Appel');
  const priorityToDb: Record<string,string> = { Basse:'low',Moyenne:'medium',Haute:'high',Urgente:'urgent' };
  const leadsQuery = useLeadsQuery(debouncedSearch, selectedPriority === 'ALL' ? '' : priorityToDb[selectedPriority]);
  const leads = leadsQuery.data ?? [];
  const stageMutation = useLeadStageMutation();
  const activityMutation = useCreateActivity();
  const { setActiveQuickActionModal, addToast } = useUiStore();

  useEffect(() => {
    const timer=window.setTimeout(()=>setDebouncedSearch(searchQuery.trim()),350);
    return()=>window.clearTimeout(timer);
  },[searchQuery]);

  const stages: { stage: LeadStage; label: string; color: string }[] = [
    { stage: 'NOUVEAU', label: 'Nouveaux', color: 'border-blue-400 bg-blue-50/50' },
    { stage: 'CONTACTE', label: 'Contactés', color: 'border-slate-300 bg-slate-50/50' },
    { stage: 'QUALIFIE', label: 'Qualifiés', color: 'border-teal-400 bg-teal-50/50' },
    { stage: 'RDV', label: 'RDV Fixé', color: 'border-indigo-400 bg-indigo-50/50' },
    { stage: 'ESSAI', label: 'Essai Routier', color: 'border-purple-400 bg-purple-50/50' },
    { stage: 'OFFRE', label: 'Offre / Devis', color: 'border-amber-400 bg-amber-50/50' },
    { stage: 'NEGOCIATION', label: 'Négociation', color: 'border-rose-400 bg-rose-50/50' },
    { stage: 'GAGNE', label: 'Gagné (Vente)', color: 'border-emerald-400 bg-emerald-50/50' },
  ];

  const filteredLeads = leads;
  const hasActiveFilters = Boolean(debouncedSearch) || selectedPriority !== 'ALL';

  const handleStageChange = async (leadId: string, newStage: LeadStage) => {
    const stage = opportunityStageToDb[newStage]; try { if (stage) await stageMutation.mutateAsync({ id: leadId, stage }); addToast({
      type: 'info',
      title: 'Étape mise à jour',
      description: `Le prospect a été déplacé vers l'étape ${newStage}.`,
    });
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead({ ...selectedLead, stage: newStage });
    }}catch(error){addToast({type:'error',title:'Mise à jour impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  const handleAddInteraction = async () => {
    if (!selectedLead || !newInteractionNote.trim()) return;

    const type={Appel:'call',Email:'email',Visite:'appointment',Essai:'test_drive'}[interactionType];
    try { await activityMutation.mutateAsync({leadId:selectedLead.id,type,subject:interactionType,description:newInteractionNote,status:'completed'});setNewInteractionNote('');addToast({type:'success',title:'Échange consigné',description:'L’historique du prospect a été enregistré dans MySQL.'}); }
    catch(error){addToast({type:'error',title:'Enregistrement impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM & Pipeline Commercial"
        subtitle="Gestion des opportunités de vente VN/VO, relances et suivi des prospects."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Commercial' }, { label: 'CRM & Prospects' }]}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
              <button
                onClick={() => setViewMode('kanban')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'kanban' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Kanban className="w-3.5 h-3.5" />
                Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'list' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Liste
              </button>
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewLeadOpen(true)}
            >
              Nouveau Prospect
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher par nom, téléphone, modèle..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Priorité :</span>
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Toutes ({leads.length})</option>
            <option value="Urgente">Urgente 🔥</option>
            <option value="Haute">Haute</option>
            <option value="Moyenne">Moyenne</option>
            <option value="Basse">Basse</option>
          </select>
        </div>
      </div>

      {leadsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Chargement des prospects impossible : {leadsQuery.error instanceof Error ? leadsQuery.error.message : 'Erreur API'}
        </div>
      )}

      {viewMode === 'kanban' && leadsQuery.isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Chargement des prospects...
        </div>
      )}

      {/* KANBAN PIPELINE VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto pb-4">
          {stages.map(({ stage, label, color }) => {
            const stageLeads = filteredLeads.filter((l) => l.stage === stage);
            const stageTotalBudget = stageLeads.reduce((acc, l) => acc + l.targetBudget, 0);

            return (
              <div key={stage} className="flex flex-col rounded-xl bg-slate-100/90 border border-slate-200/80 p-3 min-h-[500px]">
                {/* Stage Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-800">{label}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-slate-200 text-slate-700">
                      {stageLeads.length}
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500">
                    {formatCurrency(stageTotalBudget)}
                  </span>
                </div>

                {/* Lead Cards List */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                  {stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => setSelectedLead(lead)}
                      className="bg-white rounded-xl p-3.5 border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-blue-400 transition-all cursor-pointer space-y-2.5 group"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <div className="font-bold text-xs text-slate-900 group-hover:text-blue-700">
                            {lead.civility} {lead.firstName} {lead.lastName}
                          </div>
                          {lead.company && (
                            <div className="text-[10px] text-slate-400">{lead.company}</div>
                          )}
                        </div>
                        <Badge
                          variant={
                            lead.priority === 'Urgente'
                              ? 'danger'
                              : lead.priority === 'Haute'
                              ? 'warning'
                              : 'default'
                          }
                          size="sm"
                        >
                          {lead.priority}
                        </Badge>
                      </div>

                      {/* Vehicle & Budget Target */}
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 text-slate-700 font-semibold truncate">
                          <Car className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">{lead.targetVehicle}</span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>Budget :</span>
                          <span className="font-bold text-slate-800">{formatCurrency(lead.targetBudget)}</span>
                        </div>
                      </div>

                      {/* Next Action & Score */}
                      <div className="flex items-center justify-between text-[10px] pt-1 text-slate-500 border-t border-slate-100">
                        <div className="flex items-center gap-1 truncate max-w-[140px]">
                          <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="truncate">{lead.nextActionDate || 'À relancer'}</span>
                        </div>
                        <div className="font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[9px]">
                          Score: {lead.score}/100
                        </div>
                      </div>

                      {/* Quick Move Button */}
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <span className="text-slate-400 truncate">{lead.assignedToName.split(' ')[0]}</span>
                        <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                          {stage !== 'GAGNE' && (
                            <button
                              onClick={() => {
                                const currentIndex = stages.findIndex((s) => s.stage === stage);
                                if (currentIndex < stages.length - 1) {
                                  handleStageChange(lead.id, stages[currentIndex + 1].stage);
                                }
                              }}
                              className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-blue-600 hover:text-white rounded transition-colors"
                              title="Passer à l'étape suivante"
                            >
                              Avancer →
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {!leadsQuery.isLoading && !leadsQuery.isError && stageLeads.length === 0 && (
                    <div className="py-8 text-center text-slate-400 text-[11px]">
                      Aucun prospect à ce stade
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TABLE / LIST VIEW */}
      {viewMode === 'list' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Prospect</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Véhicule Cible</th>
                  <th className="py-3 px-4">Budget</th>
                  <th className="py-3 px-4">Étape Pipeline</th>
                  <th className="py-3 px-4">Conseiller</th>
                  <th className="py-3 px-4">Priorité</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leadsQuery.isLoading && (
                  <TableEmptyState colSpan={8} message="Chargement des prospects..." isLoading />
                )}
                {!leadsQuery.isLoading && !leadsQuery.isError && filteredLeads.length === 0 && (
                  <TableEmptyState
                    colSpan={8}
                    message={hasActiveFilters ? 'Aucun prospect ne correspond à vos critères' : 'Aucun prospect'}
                  />
                )}
                {filteredLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelectedLead(lead)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {lead.civility} {lead.firstName} {lead.lastName}
                      {lead.company && <div className="text-[10px] font-normal text-slate-400">{lead.company}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{lead.phone}</div>
                      <div className="text-[11px] text-slate-400">{lead.email}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{lead.targetVehicle}</td>
                    <td className="py-3 px-4 font-bold text-blue-700">{formatCurrency(lead.targetBudget)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge status={lead.stage} type="lead" />
                    </td>
                    <td className="py-3 px-4 text-slate-600">{lead.assignedToName}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          lead.priority === 'Urgente'
                            ? 'danger'
                            : lead.priority === 'Haute'
                            ? 'warning'
                            : 'default'
                        }
                        size="sm"
                      >
                        {lead.priority}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="xs"
                        variant="outline"
                        onClick={() => setSelectedLead(lead)}
                      >
                        Ouvrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* LEAD DETAIL & INTERACTIONS MODAL */}
      {selectedLead && (
        <Modal
          isOpen={Boolean(selectedLead)}
          onClose={() => setSelectedLead(null)}
          title={`Fiche Prospect : ${selectedLead.civility} ${selectedLead.firstName} ${selectedLead.lastName}`}
          description={`Créé le ${selectedLead.createdAt} • Suivi par ${selectedLead.assignedToName}`}
          maxWidth="2xl"
        >
          <div className="space-y-5">
            {/* Top overview & status change */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase block mb-1">
                  Étape Actuelle du Pipeline
                </span>
                <select
                  value={selectedLead.stage}
                  onChange={(e) => handleStageChange(selectedLead.id, e.target.value as LeadStage)}
                  className="text-xs font-bold p-1.5 rounded-lg border border-blue-400 bg-white text-blue-800 focus:outline-none"
                >
                  {stages.map((s) => (
                    <option key={s.stage} value={s.stage}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <a
                  href={`tel:${selectedLead.phone}`}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-emerald-700"
                >
                  <Phone className="w-3.5 h-3.5" />
                  Appeler ({selectedLead.phone})
                </a>
                <a
                  href={`mailto:${selectedLead.email}`}
                  className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-700"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email
                </a>
              </div>
            </div>

            {/* Vehicle requirement & budget */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-1">Véhicule recherché</span>
                <div className="font-bold text-slate-900 text-sm">{selectedLead.targetVehicle}</div>
                <div className="text-slate-500 mt-1">Source : {selectedLead.source}</div>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block mb-1">Budget prévisionnel</span>
                <div className="font-bold text-blue-700 text-sm">{formatCurrency(selectedLead.targetBudget)}</div>
                <div className="text-slate-500 mt-1">Score opportunité : {selectedLead.score}/100</div>
                <div className="text-slate-500 mt-1">Enregistré par : {selectedLead.createdByName || 'Non renseigné'}</div>
              </div>
            </div>

            {/* Interactions Timeline */}
            <div>
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                Journal des Échanges & Historique
              </h4>

              {/* Log new interaction */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 mb-4">
                <div className="flex items-center gap-2">
                  <select
                    value={interactionType}
                    onChange={(e) => setInteractionType(e.target.value as any)}
                    className="text-xs p-1.5 rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Appel">Appel téléphonique</option>
                    <option value="Email">Email envoyé</option>
                    <option value="Visite">Visite Concession</option>
                    <option value="Essai">Essai Véhicule</option>
                  </select>
                  <input
                    type="text"
                    value={newInteractionNote}
                    onChange={(e) => setNewInteractionNote(e.target.value)}
                    placeholder="Résumer l'échange ou planifier la prochaine relance..."
                    className="flex-1 text-xs p-1.5 rounded-lg border border-slate-300 bg-white focus:outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddInteraction()}
                  />
                  <Button size="xs" variant="primary" onClick={handleAddInteraction}>
                    Ajouter
                  </Button>
                </div>
              </div>

              {/* Timeline feed */}
              <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-slate-100 pr-1">
                <div className="pt-2 text-xs">
                  <div className="text-slate-500 mb-0.5 font-semibold">Notes & Historique :</div>
                  <pre className="text-slate-600 text-[11px] font-sans whitespace-pre-wrap leading-relaxed">{selectedLead.notes || 'Aucune note.'}</pre>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setSelectedLead(null);
                  setActiveQuickActionModal('sale');
                }}
              >
                Transformer en Vente / Bon de Commande
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* New Lead Modal */}
      <NewLeadModal
        isOpen={isNewLeadOpen}
        onClose={() => setIsNewLeadOpen(false)}
      />
    </div>
  );
};
