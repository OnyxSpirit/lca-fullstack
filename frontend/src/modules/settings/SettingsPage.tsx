import React, { useEffect, useState } from 'react';
import { Building2, Plus, Save } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { useUiStore } from '../../stores/uiStore';
import { type AgencyInput, type ConcessionIdentity, type SettingsAgency, type WorkshopRates, useAgencyActions, useCurrentConcessionQuery, useSettingsAgenciesQuery, useSettingsQuery, useUpdateConcession, useUpdateSettings } from '../../api/settingHooks';

type Tab = 'general' | 'workshop' | 'agencies' | 'integrations';
const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';
const emptyIdentity: Omit<ConcessionIdentity, 'id'> = { name: '', legalName: null, taxIdentifier: null, address: null, city: null, country: 'République du Congo', currencyCode: 'XAF', timezone: 'Africa/Brazzaville' };
const emptyAgency: AgencyInput = { name: '', code: '', address: '', city: '', phone: '', email: '' };

export const SettingsPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('general');
  const [identity, setIdentity] = useState(emptyIdentity);
  const [vat, setVat] = useState(18.9);
  const [rates, setRates] = useState<WorkshopRates>({ T1: 35000, T2: 45000, T3: 55000, T4: 45000 });
  const [agencyForm, setAgencyForm] = useState<AgencyInput>(emptyAgency);
  const [editedAgency, setEditedAgency] = useState<SettingsAgency | null>(null);
  const settings = useSettingsQuery(), concession = useCurrentConcessionQuery(), agencies = useSettingsAgenciesQuery();
  const updateSettings = useUpdateSettings(), updateConcession = useUpdateConcession(), agencyActions = useAgencyActions();
  const addToast = useUiStore(s => s.addToast);

  useEffect(() => { if (concession.data) setIdentity({ name: concession.data.name, legalName: concession.data.legalName, taxIdentifier: concession.data.taxIdentifier, address: concession.data.address, city: concession.data.city, country: concession.data.country, currencyCode: concession.data.currencyCode, timezone: concession.data.timezone }) }, [concession.data]);
  useEffect(() => { if (settings.data) { setVat(settings.data.billing.defaultVatRate); setRates(settings.data.workshop.rates); } }, [settings.data]);
  const notify = (title: string) => addToast({ type: 'success', title });
  const fail = (error: unknown) => addToast({ type: 'error', title: 'Opération impossible', description: error instanceof Error ? error.message : 'Erreur API' });
  const saveIdentity = async (e: React.FormEvent) => { e.preventDefault(); try { await updateConcession.mutateAsync(identity); notify('Identité de la concession enregistrée'); } catch (error) { fail(error); } };
  const saveBusiness = async (e: React.FormEvent) => { e.preventDefault(); try { await updateSettings.mutateAsync({ billing: { defaultVatRate: vat }, workshop: { rates } }); notify('Paramètres métier enregistrés'); } catch (error) { fail(error); } };
  const createAgency = async (e: React.FormEvent) => { e.preventDefault(); try { await agencyActions.create.mutateAsync(agencyForm); setAgencyForm(emptyAgency); notify('Agence créée'); } catch (error) { fail(error); } };
  const saveAgency = async (e: React.FormEvent) => { e.preventDefault(); if (!editedAgency) return; try { await agencyActions.update.mutateAsync(editedAgency); setEditedAgency(null); notify('Agence mise à jour'); } catch (error) { fail(error); } };
  const toggleAgency = async (agency: SettingsAgency) => { try { await agencyActions.status.mutateAsync({ id: agency.id, isActive: !agency.isActive }); notify(agency.isActive ? 'Agence désactivée' : 'Agence réactivée'); } catch (error) { fail(error); } };
  const updateIdentity = (key: keyof typeof identity, value: string) => setIdentity(current => ({ ...current, [key]: value || null }));

  return <div className="space-y-6">
    <PageHeader title="Paramètres concession" subtitle="Identité légale, fiscalité, barèmes atelier et agences." breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Paramètres' }]} />
    <div className="flex gap-1 overflow-x-auto border-b border-slate-200">{(['general','workshop','agencies','integrations'] as Tab[]).map(key => <button key={key} className={`whitespace-nowrap border-b-2 px-4 py-3 text-xs font-bold ${tab === key ? 'border-[#8f1722] text-[#8f1722]' : 'border-transparent text-slate-500'}`} onClick={() => setTab(key)}>{({ general:'Identité & fiscalité', workshop:'Barèmes atelier', agencies:`Agences (${agencies.data?.length ?? 0})`, integrations:'Intégrations' })[key]}</button>)}</div>

    {tab === 'general' && <Card><CardHeader><div><CardTitle>Informations de la concession</CardTitle><CardDescription>Ces données alimentent notamment les documents commerciaux et comptables.</CardDescription></div></CardHeader><form onSubmit={saveIdentity} className="grid gap-4 md:grid-cols-2">
      {[['name','Nom commercial'],['legalName','Raison sociale'],['taxIdentifier','Identifiant fiscal / NIU'],['address','Adresse'],['city','Ville'],['country','Pays'],['currencyCode','Devise ISO'],['timezone','Fuseau horaire']].map(([key,label]) => <label key={key} className="text-xs font-semibold text-slate-700">{label}<input required={['name','currencyCode','timezone'].includes(key)} className={`${field} mt-1`} value={String(identity[key as keyof typeof identity] ?? '')} onChange={e => updateIdentity(key as keyof typeof identity, e.target.value)} /></label>)}
      <label className="text-xs font-semibold text-slate-700">TVA par défaut (%)<input className={`${field} mt-1`} type="number" min="0" max="100" step="0.01" value={vat} onChange={e => setVat(Number(e.target.value))} /></label>
      <div className="flex items-end gap-2"><Button type="submit" icon={<Save className="h-4 w-4" />} loading={updateConcession.isPending}>Enregistrer l’identité</Button><Button type="button" variant="outline" onClick={saveBusiness} loading={updateSettings.isPending}>Enregistrer la TVA</Button></div>
    </form></Card>}

    {tab === 'workshop' && <Card><CardHeader><div><CardTitle>Barèmes horaires atelier</CardTitle><CardDescription>Tarifs HT en XAF appliqués aux nouvelles lignes de main-d’œuvre.</CardDescription></div></CardHeader><form onSubmit={saveBusiness} className="grid gap-4 md:grid-cols-2">{([['T1','T1 · Entretien rapide'],['T2','T2 · Mécanique'],['T3','T3 · Diagnostic et électronique'],['T4','T4 · Carrosserie et peinture']] as const).map(([key,label]) => <label key={key} className="text-xs font-semibold text-slate-700">{label}<div className="mt-1 flex items-center gap-2"><input className={field} type="number" min="0" step="1" value={rates[key]} onChange={e => setRates(current => ({ ...current, [key]: Number(e.target.value) }))} /><span className="whitespace-nowrap text-slate-500">XAF HT/h</span></div></label>)}<div className="md:col-span-2"><Button type="submit" icon={<Save className="h-4 w-4" />} loading={updateSettings.isPending}>Enregistrer les barèmes</Button></div></form></Card>}

    {tab === 'agencies' && <div className="space-y-4"><Card><CardHeader><div><CardTitle>Créer une agence</CardTitle><CardDescription>Les codes doivent être uniques dans la base.</CardDescription></div></CardHeader><form onSubmit={createAgency} className="grid gap-3 md:grid-cols-3">{(['name','code','address','city','phone','email'] as const).map(key => <input key={key} required={key === 'name' || key === 'code'} className={field} placeholder={({name:'Nom',code:'Code',address:'Adresse',city:'Ville',phone:'Téléphone',email:'E-mail'})[key]} value={String(agencyForm[key] ?? '')} onChange={e => setAgencyForm(current => ({ ...current, [key]: e.target.value }))} />)}<div><Button type="submit" icon={<Plus className="h-4 w-4" />} loading={agencyActions.create.isPending}>Créer l’agence</Button></div></form></Card>
      {agencies.isError && <Card className="border-red-200 text-sm text-red-700">{agencies.error instanceof Error ? agencies.error.message : 'Chargement impossible'}</Card>}
      <div className="grid gap-4 md:grid-cols-2">{agencies.data?.map(agency => <Card key={agency.id}><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold">{agency.name}</h3><p className="text-xs text-slate-500">{agency.code} · {agency.city || 'Ville non renseignée'}</p></div><Badge variant={agency.isActive ? 'success' : 'default'}>{agency.isActive ? 'Active' : 'Inactive'}</Badge></div><p className="mt-3 text-xs text-slate-600">{agency.address || 'Adresse non renseignée'}<br />{agency.phone || 'Téléphone non renseigné'} · {agency.email || 'E-mail non renseigné'}</p><div className="mt-4 flex gap-2 border-t pt-3"><Button size="xs" variant="outline" onClick={() => setEditedAgency(agency)}>Modifier</Button><Button size="xs" variant={agency.isActive ? 'danger' : 'success'} onClick={() => toggleAgency(agency)} loading={agencyActions.status.isPending}>{agency.isActive ? 'Désactiver' : 'Réactiver'}</Button></div></Card>)}</div>
      {editedAgency && <Card><CardHeader><div><CardTitle>Modifier {editedAgency.name}</CardTitle><CardDescription>L’historique métier reste rattaché à cette agence.</CardDescription></div></CardHeader><form onSubmit={saveAgency} className="grid gap-3 md:grid-cols-3">{(['name','code','address','city','phone','email'] as const).map(key => <input key={key} required={key === 'name' || key === 'code'} className={field} value={String(editedAgency[key] ?? '')} onChange={e => setEditedAgency(current => current ? ({ ...current, [key]: e.target.value }) : current)} />)}<div className="flex gap-2"><Button type="submit" loading={agencyActions.update.isPending}>Enregistrer</Button><Button type="button" variant="outline" onClick={() => setEditedAgency(null)}>Annuler</Button></div></form></Card>}
    </div>}

    {tab === 'integrations' && <Card><CardHeader><div><CardTitle>Intégrations externes</CardTitle><CardDescription>Aucun connecteur ne doit être présenté comme actif sans configuration technique réelle.</CardDescription></div></CardHeader><div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 p-6 text-sm text-slate-600"><Building2 className="h-5 w-5" /><div><b>Aucune intégration configurée</b><p className="text-xs">Connecteurs DMS et portails d’annonces : à venir.</p></div></div></Card>}
  </div>;
};
