import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Plus,
  Search,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Car,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { useCreateCustomer, useCustomersQuery } from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { TableEmptyState } from '../../components/common/TableEmptyState';

export const CustomersListPage: React.FC = () => {
  const { addToast } = useUiStore();
  const { currentUser, currentAgency } = useAuthStore();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'ALL' | 'Particulier' | 'Professionnel'>('ALL');
  const [isNewCustomerOpen, setIsNewCustomerOpen] = useState(false);
  const customersQuery = useCustomersQuery(debouncedSearch,selectedType==='ALL'?'':selectedType==='Particulier'?'individual':'company'); const customers = customersQuery.data ?? []; const createCustomer = useCreateCustomer();
  useEffect(()=>{const timer=window.setTimeout(()=>setDebouncedSearch(searchQuery.trim()),350);return()=>window.clearTimeout(timer)},[searchQuery]);

  const [newCustomerForm, setNewCustomerForm] = useState({
    type: 'Particulier' as 'Particulier' | 'Professionnel',
    civility: 'M.' as 'M.' | 'Mme' | 'Société',
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    postalCode: '',
    city: 'Brazzaville',
  });

  const filteredCustomers = customers;
  const hasActiveFilters = Boolean(debouncedSearch) || selectedType !== 'ALL';

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((newCustomerForm.type==='Particulier'&&!newCustomerForm.lastName) || (newCustomerForm.type==='Professionnel'&&!newCustomerForm.company) || !newCustomerForm.phone) {
      addToast({
        type: 'error',
        title: 'Champs requis manquants',
        description: 'Veuillez saisir le nom et le numéro de téléphone.',
      });
      return;
    }

    try { await createCustomer.mutateAsync({
      customerType: newCustomerForm.type === 'Particulier' ? 'individual' : 'company',
      civility:newCustomerForm.civility,
      firstName: newCustomerForm.firstName,
      lastName: newCustomerForm.lastName,
      companyName: newCustomerForm.company || undefined,
      email: newCustomerForm.email,
      phone: newCustomerForm.phone,
      secondaryPhone: newCustomerForm.phone,
      address: newCustomerForm.address,
      postalCode:newCustomerForm.postalCode,
      city: newCustomerForm.city,
      country: 'Congo',
      agencyId:currentAgency?.id,
      assignedUserId: currentUser?.id,
    });
    addToast({
      type: 'success',
      title: 'Client enregistré',
      description: `La fiche 360° pour ${newCustomerForm.firstName} ${newCustomerForm.lastName} a été créée.`,
    });

    setIsNewCustomerOpen(false);
    } catch (error) {
      addToast({ type: 'error', title: 'Création impossible', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fiches Clients 360° (Particuliers & Entreprises)"
        subtitle="Référentiel unifié : véhicules possédés, opportunités d'achat, historique SAV et facturation."
        breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Clients' }, { label: 'Fiches 360°' }]}
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsNewCustomerOpen(true)}
          >
            Nouveau Client
          </Button>
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
            placeholder="Rechercher par nom, code client, entreprise, email, téléphone..."
            className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as any)}
            className="text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 font-medium focus:outline-none"
          >
            <option value="ALL">Tous types ({customers.length})</option>
            <option value="Particulier">Particuliers</option>
            <option value="Professionnel">Professionnels & Flottes</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <Card padding="none">
        {customersQuery.isError&&<div className="p-4 text-sm text-red-700 bg-red-50 border-b border-red-200">Chargement des clients impossible : {customersQuery.error instanceof Error?customersQuery.error.message:'Erreur API'}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Code & Client</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Coordonnées</th>
                <th className="py-3 px-4">Ville</th>
                <th className="py-3 px-4">Conseiller</th>
                <th className="py-3 px-4">Classification</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customersQuery.isLoading && (
                <TableEmptyState colSpan={7} message="Chargement des clients..." isLoading />
              )}
              {!customersQuery.isLoading && !customersQuery.isError && filteredCustomers.length === 0 && (
                <TableEmptyState
                  colSpan={7}
                  message={hasActiveFilters ? 'Aucun client ne correspond à vos critères' : 'Aucun client'}
                />
              )}
              {filteredCustomers.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold shrink-0">
                        {c.type === 'Professionnel' ? <Building className="w-4 h-4 text-blue-600" /> : <User className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {c.civility} {c.firstName} {c.lastName}
                        </div>
                        {c.company && <div className="text-[11px] text-slate-500 font-semibold">{c.company}</div>}
                        <div className="text-[10px] text-slate-400 font-mono">{c.code}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={c.type === 'Professionnel' ? 'primary' : 'default'} size="sm">
                      {c.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <div>{c.phone}</div>
                    <div className="text-[11px] text-slate-400">{c.email}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{c.city}</td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">
                      <span className="text-slate-700">{c.salesRepName}</span>
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={c.rating === 'VIP' ? 'warning' : 'primary'} size="sm">
                      {c.rating}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="xs" variant="outline" onClick={() => navigate(`/customers/${c.id}`)}>
                      Vue 360°
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* New Customer Modal */}
      <Modal
        isOpen={isNewCustomerOpen}
        onClose={() => setIsNewCustomerOpen(false)}
        title="Créer une Fiche Client (Particulier ou Professionnel)"
        description="Ajouter un contact au référentiel client unifié de la concession."
        maxWidth="lg"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type de compte</label>
              <select
                value={newCustomerForm.type}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, type: e.target.value as any })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="Particulier">Particulier</option>
                <option value="Professionnel">Professionnel / Entreprise</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Civilité</label>
              <select
                value={newCustomerForm.civility}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, civility: e.target.value as any })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              >
                <option value="M.">M.</option>
                <option value="Mme">Mme</option>
                <option value="Société">Société</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Adresse</label>
              <input type="text" value={newCustomerForm.address} onChange={e=>setNewCustomerForm({...newCustomerForm,address:e.target.value})} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code postal</label>
              <input type="text" value={newCustomerForm.postalCode} onChange={e=>setNewCustomerForm({...newCustomerForm,postalCode:e.target.value})} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ville</label>
              <input type="text" value={newCustomerForm.city} onChange={e=>setNewCustomerForm({...newCustomerForm,city:e.target.value})} className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white" />
            </div>
          </div>

          {newCustomerForm.type === 'Professionnel' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Raison Sociale / Société</label>
              <input
                type="text"
                value={newCustomerForm.company}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, company: e.target.value })}
                placeholder="ex: SAS Transports & Logistique"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Prénom</label>
              <input
                type="text"
                value={newCustomerForm.firstName}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, firstName: e.target.value })}
                placeholder="ex: Thomas"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={newCustomerForm.lastName}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, lastName: e.target.value })}
                placeholder="ex: Bernard"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Téléphone *</label>
              <input
                type="tel"
                required
                value={newCustomerForm.phone}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                placeholder="ex: 06 98 76 54 32"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                placeholder="ex: contact@societe.fr"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsNewCustomerOpen(false)}>
              Annuler
            </Button>
            <Button variant="primary" type="submit">
              Enregistrer le client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
