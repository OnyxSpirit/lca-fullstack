import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  User,
  Building,
  Phone,
  Mail,
  MapPin,
  Car,
  Wrench,
  BadgePercent,
  Receipt,
  FileText,
  Clock,
  Plus,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useCreateCustomerContact, useCustomer360Query } from '../../api/erpHooks';
import { useUiStore } from '../../stores/uiStore';
import { PageHeader } from '../../components/common/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { Modal } from '../../components/ui/Modal';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const customerQuery=useCustomer360Query(id);const data=customerQuery.data;
  const timeline=data?.timeline??[],customerVehicles=data?.vehicles??[],customerSales=data?.sales??[],customerORs=data?.repairOrders??[],customerInvoices=data?.invoices??[],contacts=data?.contacts??[],opportunities=data?.opportunities??[];
  const { setActiveQuickActionModal } = useUiStore();

  const customer = data?.customer;
  const [activeTab, setActiveTab] = useState<'timeline' | 'contacts' | 'opportunities' | 'vehicles' | 'sales' | 'sav' | 'billing'>('timeline');
  const [contactOpen,setContactOpen]=useState(false);const createContact=useCreateCustomerContact(id);const[contact,setContact]=useState({firstName:'',lastName:'',roleTitle:'',email:'',phone:'',isPrimary:false});

  if(customerQuery.isLoading)return <div className="p-8 text-sm text-slate-500">Chargement du client…</div>;
  if (customerQuery.isError) return <div className="p-8 text-center"><p className="text-red-700 mb-4">Chargement de la fiche 360° impossible : {customerQuery.error instanceof Error?customerQuery.error.message:'Erreur API'}</p><Button variant="outline" onClick={()=>navigate('/customers')}>Retour aux clients</Button></div>;
  if (!customer) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-500 mb-4">Client introuvable.</p>
        <Button variant="outline" onClick={() => navigate('/customers')}>
          Retour aux clients
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${customer.civility} ${customer.firstName} ${customer.lastName}`}
        subtitle={`Code : ${customer.code} • ${customer.type} • ${customer.city} (${customer.zipCode})`}
        breadcrumbs={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Clients', href: '/customers' },
          { label: `${customer.firstName} ${customer.lastName}` },
        ]}
        badge={<Badge variant={customer.type === 'Professionnel' ? 'primary' : 'default'} size="md">{customer.type}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={<Wrench className="w-4 h-4" />}
              onClick={() => setActiveQuickActionModal('or',{customerId:customer.id})}
            >
              Nouveau RDV / OR
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<BadgePercent className="w-4 h-4" />}
              onClick={() => setActiveQuickActionModal('sale',{customerId:customer.id})}
            >
              Créer Vente
            </Button>
          </div>
        }
      />

      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Coordonnées & Informations</CardTitle>
          </CardHeader>
          <div className="space-y-3 text-xs">
            {customer.company && (
              <div className="p-2.5 bg-blue-50 rounded-lg text-blue-900 font-semibold flex items-center gap-2">
                <Building className="w-4 h-4 text-blue-700" />
                <span>{customer.company}</span>
              </div>
            )}
            <div className="flex items-center gap-2.5 text-slate-700">
              <Phone className="w-4 h-4 text-slate-400" />
              <a href={`tel:${customer.phone}`} className="font-semibold text-blue-600 hover:underline">
                {customer.phone}
              </a>
            </div>
            <div className="flex items-center gap-2.5 text-slate-700">
              <Mail className="w-4 h-4 text-slate-400" />
              <a href={`mailto:${customer.email}`} className="text-slate-800 hover:underline truncate">
                {customer.email}
              </a>
            </div>
            <div className="flex items-start gap-2.5 text-slate-700">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>{customer.address}, {customer.zipCode} {customer.city}</span>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-wrap gap-1">
              <Badge variant="primary" size="sm">Client depuis : {customer.clientSince}</Badge>
              <Badge variant={customer.rating === 'VIP' ? 'warning' : 'default'} size="sm">Statut : {customer.rating}</Badge>
            </div>
          </div>
        </Card>

        {/* Quick KPI Summary */}
        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Véhicules Rattachés</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{customerVehicles.length}</div>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Commandes Ventes</span>
            <div className="text-xl font-bold text-blue-700 mt-1">{customerSales.length}</div>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Passages Atelier SAV</span>
            <div className="text-xl font-bold text-amber-700 mt-1">{customerORs.length}</div>
          </div>
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Factures Émises</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">{customerInvoices.length}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto">
        {[
          { key: 'timeline', label: 'Timeline Événements' },
          { key: 'contacts', label: `Contacts (${contacts.length})` },
          { key: 'opportunities', label: `Opportunités (${opportunities.length})` },
          { key: 'vehicles', label: `Véhicules Rattachés (${customerVehicles.length})` },
          { key: 'sales', label: `Ventes & Devis (${customerSales.length})` },
          { key: 'sav', label: `Atelier SAV & OR (${customerORs.length})` },
          { key: 'billing', label: `Facturation (${customerInvoices.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all shrink-0 cursor-pointer ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: TIMELINE */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Journal d'Activité & Historique Relation Client 360°</CardTitle>
          </CardHeader>
          <div className="space-y-4 text-xs">{timeline.map((event:any)=><div key={`${event.event_type}-${event.reference_id}-${event.event_at}`} className="flex gap-3 items-start"><div className="w-8 h-8 rounded-full bg-slate-100 text-[#8f1722] flex items-center justify-center shrink-0"><Clock className="w-4 h-4"/></div><div><div className="font-bold text-slate-900">{event.title}</div><p className="text-slate-500 mt-0.5">{event.description||'—'}</p><span className="text-[10px] text-slate-400">{formatDate(event.event_at)}</span></div></div>)}{!timeline.length&&<p className="text-slate-500">Aucun événement enregistré pour ce client.</p>}</div>
        </Card>
      )}

      {activeTab === 'contacts' && <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Contacts du client</CardTitle><Button size="xs" variant="primary" onClick={()=>setContactOpen(true)}>Ajouter un contact</Button></div></CardHeader><div className="space-y-2">{contacts.map((item:any)=><div key={item.id} className="p-3 border border-slate-200 rounded-lg text-xs"><div className="font-bold">{item.first_name} {item.last_name}{item.is_primary?' • Principal':''}</div><div className="text-slate-500">{item.role_title||'—'} • {item.phone||'—'} • {item.email||'—'}</div></div>)}{!contacts.length&&<p className="text-xs text-slate-500">Aucun contact enregistré.</p>}</div></Card>}

      {activeTab === 'opportunities' && <Card><CardHeader><CardTitle>Opportunités liées</CardTitle></CardHeader><div className="space-y-2">{opportunities.map((item:any)=><div key={item.id} className="p-3 border border-slate-200 rounded-lg text-xs flex justify-between"><div><div className="font-bold">{item.title}</div><div className="text-slate-500">Probabilité : {item.probability}%</div></div><div className="font-semibold">{item.stage}</div></div>)}{!opportunities.length&&<p className="text-xs text-slate-500">Aucune opportunité rattachée.</p>}</div></Card>}

      {/* TAB 2: VEHICLES OWNED */}
      {activeTab === 'vehicles' && (
        <div className="space-y-3">
          {customerVehicles.map((v) => (
            <div key={v.id} className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{v.brand} {v.model}</h4>
                  <div className="text-xs text-slate-500">
                    Immatriculation : <span className="font-mono font-bold text-slate-700">{v.registrationNumber}</span> • VIN : <span className="font-mono text-slate-600">{v.vin}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Mise en circulation : {v.firstRegistrationDate} • Kilométrage actuel : {v.mileage?.toLocaleString()} km
                  </div>
                </div>
              </div>
              <Button size="xs" variant="outline" onClick={() => setActiveQuickActionModal('or',{customerId:customer.id,vehicleId:v.id})}>
                Ouvrir un OR SAV
              </Button>
            </div>
          ))}
          {customerVehicles.length === 0 && (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              Aucun véhicule rattaché pour le moment.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SALES */}
      {activeTab === 'sales' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">N° Commande</th>
                  <th className="py-2.5 px-4">Véhicule</th>
                  <th className="py-2.5 px-4">Montant TTC</th>
                  <th className="py-2.5 px-4">Financement</th>
                  <th className="py-2.5 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerSales.map((s) => (
                  <tr key={s.id} onClick={() => navigate(`/sales/${s.id}`)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="py-2.5 px-4 font-bold text-blue-700">{s.saleNumber}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{s.vehicleLabel}</td>
                    <td className="py-2.5 px-4 font-bold">{formatCurrency(s.totalSaleTTC)}</td>
                    <td className="py-2.5 px-4 text-slate-600">{s.financingType}</td>
                    <td className="py-2.5 px-4"><StatusBadge status={s.status} type="sale" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 4: SAV & REPAIR ORDERS */}
      {activeTab === 'sav' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">N° OR</th>
                  <th className="py-2.5 px-4">Véhicule</th>
                  <th className="py-2.5 px-4">Motif Réparation</th>
                  <th className="py-2.5 px-4">Total TTC</th>
                  <th className="py-2.5 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerORs.map((orItem) => (
                  <tr key={orItem.id} onClick={() => navigate(`/service/repair-orders/${orItem.id}`)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="py-2.5 px-4 font-bold text-blue-700">{orItem.orNumber}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{orItem.vehicleModel} ({orItem.vehiclePlate})</td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">{orItem.symptomsReported}</td>
                    <td className="py-2.5 px-4 font-bold">{formatCurrency(orItem.finalTotalTTC)}</td>
                    <td className="py-2.5 px-4"><StatusBadge status={orItem.status} type="or" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* TAB 5: BILLING */}
      {activeTab === 'billing' && (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">N° Facture</th>
                  <th className="py-2.5 px-4">Émise le</th>
                  <th className="py-2.5 px-4">Montant TTC</th>
                  <th className="py-2.5 px-4">Reste Dû</th>
                  <th className="py-2.5 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-blue-700">{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-4 text-slate-600">{inv.issueDate}</td>
                    <td className="py-2.5 px-4 font-bold">{formatCurrency(inv.amountTTC)}</td>
                    <td className="py-2.5 px-4 font-bold text-rose-600">{formatCurrency(inv.remainingAmountTTC)}</td>
                    <td className="py-2.5 px-4"><StatusBadge status={inv.status} type="invoice" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <Modal isOpen={contactOpen} onClose={()=>setContactOpen(false)} title="Ajouter un contact" maxWidth="lg"><form className="space-y-3" onSubmit={async e=>{e.preventDefault();await createContact.mutateAsync(contact);setContactOpen(false);setContact({firstName:'',lastName:'',roleTitle:'',email:'',phone:'',isPrimary:false})}}><div className="grid grid-cols-2 gap-3"><input required placeholder="Prénom" value={contact.firstName} onChange={e=>setContact({...contact,firstName:e.target.value})} className="text-xs p-2.5 border rounded-lg"/><input required placeholder="Nom" value={contact.lastName} onChange={e=>setContact({...contact,lastName:e.target.value})} className="text-xs p-2.5 border rounded-lg"/><input placeholder="Fonction" value={contact.roleTitle} onChange={e=>setContact({...contact,roleTitle:e.target.value})} className="text-xs p-2.5 border rounded-lg"/><input placeholder="Téléphone" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})} className="text-xs p-2.5 border rounded-lg"/><input type="email" placeholder="E-mail" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} className="text-xs p-2.5 border rounded-lg col-span-2"/></div><label className="text-xs flex gap-2"><input type="checkbox" checked={contact.isPrimary} onChange={e=>setContact({...contact,isPrimary:e.target.checked})}/>Contact principal</label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>setContactOpen(false)}>Annuler</Button><Button type="submit" variant="primary" loading={createContact.isPending}>Enregistrer</Button></div></form></Modal>
    </div>
  );
};
