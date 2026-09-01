import React, { useEffect, useState } from 'react';
import {
  Settings,
  Building,
  Wrench,
  Percent,
  CreditCard,
  Shield,
  Save,
  CheckCircle2,
  Car,
  Globe,
  Mail,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { useSaveSettings, useSettingsQuery } from '../../api/erpHooks';

export const SettingsPage: React.FC = () => {
  const { allAgencies } = useAuthStore();
  const agencies = allAgencies;
  const { addToast } = useUiStore();
  const settingsQuery=useSettingsQuery(); const saveSettings=useSaveSettings();

  const [activeTab, setActiveTab] = useState<'general' | 'rates' | 'agencies' | 'integrations'>('general');

  const [generalConfig, setGeneralConfig] = useState({
    groupName: 'La Congolaise de l’Automobile',
    siret: '',
    vatNumber: '',
    headquartersAddress: 'Brazzaville, République du Congo',
    defaultVatRate: 18.9,
    registrationFeeStandard: 0,
    administrativeFeeStandard: 0,
  });

  const [workshopRates, setWorkshopRates] = useState({
    rateT1_Maintenance: 35000,
    rateT2_Mechanics: 45000,
    rateT3_DiagElectric: 55000,
    rateT4_Bodywork: 45000,
  });
  useEffect(()=>{const data=settingsQuery.data;if(data?.generalConfig)setGeneralConfig(current=>({...current,...data.generalConfig}));if(data?.workshopRates)setWorkshopRates(current=>({...current,...data.workshopRates}));},[settingsQuery.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try{await saveSettings.mutateAsync({generalConfig,workshopRates});addToast({
      type: 'success',
      title: 'Paramètres enregistrés',
      description: 'La configuration générale de la concession a été mise à jour.',
    });}catch(error){addToast({type:'error',title:'Enregistrement impossible',description:error instanceof Error?error.message:'Erreur API'});}
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Paramètres Généraux de la Concession"
        subtitle="Configuration du groupe automobile, barèmes de main d'œuvre après-vente, multi-sites et passerelles."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Administration' }, { label: 'Paramètres' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Save className="w-4 h-4" />}
            onClick={handleSave}
            loading={saveSettings.isPending}
          >
            Enregistrer les Modifications
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        {[
          { key: 'general', label: 'Identité Juridique & Siège' },
          { key: 'rates', label: 'Taux Horaires Atelier SAV (T1/T2/T3)' },
          { key: 'agencies', label: `Points de Vente & Agences (${agencies.length})` },
          { key: 'integrations', label: 'Passerelles VO & DMS' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GENERAL */}
      {activeTab === 'general' && (
        <Card>
          <CardHeader>
            <CardTitle>Raison Sociale & Informations Légales Facturation</CardTitle>
            <CardDescription>Mentions obligatoires sur les bons de commande et factures</CardDescription>
          </CardHeader>

          <form onSubmit={handleSave} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nom du Groupe Automobile</label>
                <input
                  type="text"
                  value={generalConfig.groupName}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, groupName: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Numéro SIRET</label>
                <input
                  type="text"
                  value={generalConfig.siret}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, siret: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">TVA Intracommunautaire</label>
                <input
                  type="text"
                  value={generalConfig.vatNumber}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, vatNumber: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white font-mono"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Taux de TVA par défaut (%)</label>
                <input
                  type="number"
                  value={generalConfig.defaultVatRate}
                  onChange={(e) => setGeneralConfig({ ...generalConfig, defaultVatRate: parseFloat(e.target.value) || 20 })}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Adresse Siège Social</label>
              <input
                type="text"
                value={generalConfig.headquartersAddress}
                onChange={(e) => setGeneralConfig({ ...generalConfig, headquartersAddress: e.target.value })}
                className="w-full p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button variant="primary" type="submit">Enregistrer</Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 2: WORKSHOP RATES */}
      {activeTab === 'rates' && (
        <Card>
          <CardHeader>
            <CardTitle>Barèmes Horaires Atelier (Main d'Œuvre SAV)</CardTitle>
            <CardDescription>Taux appliqués automatiquement lors de la création d'un ordre de réparation</CardDescription>
          </CardHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Taux T1 : Entretien Rapide & Vidange</span>
                <span className="font-bold text-blue-700 text-sm">{workshopRates.rateT1_Maintenance.toLocaleString('fr-CG')} FCFA HT / h</span>
              </div>
              <p className="text-[11px] text-slate-500">Vidange, filtration, bougies, remplacement balais d'essuie-glace.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Taux T2 : Mécanique & Liaisons au Sol</span>
                <span className="font-bold text-blue-700 text-sm">{workshopRates.rateT2_Mechanics.toLocaleString('fr-CG')} FCFA HT / h</span>
              </div>
              <p className="text-[11px] text-slate-500">Plaquettes, disques, embrayage, distribution, suspensions.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Taux T3 : Diagnostic & Électronique</span>
                <span className="font-bold text-blue-700 text-sm">{workshopRates.rateT3_DiagElectric.toLocaleString('fr-CG')} FCFA HT / h</span>
              </div>
              <p className="text-[11px] text-slate-500">Recherche de panne valise OBD, habilitation batterie haute tension VE/VH.</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-900">Taux T4 : Carrosserie & Peinture</span>
                <span className="font-bold text-blue-700 text-sm">{workshopRates.rateT4_Bodywork.toLocaleString('fr-CG')} FCFA HT / h</span>
              </div>
              <p className="text-[11px] text-slate-500">Débosselage, vitrage, préparation éléments et cabine de peinture.</p>
            </div>
          </div>
        </Card>
      )}

      {/* TAB 3: AGENCIES */}
      {activeTab === 'agencies' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {agencies.map((agency) => (
              <Card key={agency.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{agency.name}</h4>
                    <div className="text-xs text-slate-500">{agency.city}</div>
                  </div>
                  <Badge variant="primary" size="sm">Code: {agency.code}</Badge>
                </div>

                <div className="text-xs text-slate-600 space-y-1">
                  <div>{agency.address}</div>
                  <div>Tél : {agency.phone}</div>
                  <div>Email : {agency.email}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-xs">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Concession Ouverte
                  </span>
                  <Button size="xs" variant="outline">Modifier Fiche</Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <Card>
          <CardHeader>
            <CardTitle>Passerelles Portails d'Annonces VO & DMS Constructeur</CardTitle>
            <CardDescription>Publication automatique de votre stock sur les portails majeurs</CardDescription>
          </CardHeader>

          <div className="divide-y divide-slate-100 text-xs">
            <div className="py-3.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">LaCentrale / Promoneuf</div>
                <div className="text-slate-500">Flux quotidien automatique des véhicules disponibles</div>
              </div>
              <Badge variant="success" size="sm">Connecté</Badge>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Leboncoin Pro Auto</div>
                <div className="text-slate-500">Diffusion multidiffusion de votre catalogue d'occasions</div>
              </div>
              <Badge variant="success" size="sm">Connecté</Badge>
            </div>

            <div className="py-3.5 flex items-center justify-between">
              <div>
                <div className="font-bold text-slate-900">Passerelle SIV (Système d'Immatriculation des Véhicules)</div>
                <div className="text-slate-500">Télétransmission des cartes grises et déclarations d'achat (DA)</div>
              </div>
              <Badge variant="success" size="sm">Certifié ANTS</Badge>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
