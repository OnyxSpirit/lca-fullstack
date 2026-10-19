import React, { useEffect, useState } from 'react';
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
import { useEntityDocuments } from '../../api/documentHooks';
import { apiDownload } from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';
import {CUSTOMER_360_PAGE_SIZES,newCustomer360Pages,synchronizeCustomer360Pages,type Customer360PageKey} from './customer360Pagination';
import { quotationStatusLabel } from '../../lib/userFacingLabels';

export const CustomerDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pages,setPages]=useState(newCustomer360Pages);
  const [pageSize,setPageSize]=useState<(typeof CUSTOMER_360_PAGE_SIZES)[number]>(7);
  const customerQuery=useCustomer360Query(id,pages,pageSize);const data=customerQuery.data;
  const items=(value:any)=>Array.isArray(value)?value:value?.items??[],total=(value:any)=>Array.isArray(value)?value.length:value?.total??0;
  const timeline=items(data?.timeline),customerVehicles=items(data?.vehicles),customerSales=items(data?.sales),customerQuotations=items(data?.quotations),customerORs=items(data?.repairOrders),customerInvoices=items(data?.invoices),contacts=data?.contacts??[],opportunities=items(data?.opportunities);
  const { setActiveQuickActionModal,addToast } = useUiStore();
  const can=useAuthStore(state=>state.can);
  const canViewSales=can('sales.view');
  const canViewQuotations=can('quotations.view');
  const canViewCrm=can('crm.prospect.view');
  const canViewService=can('service.order.view');
  const canViewBilling=can('billing.invoice.view');
  const canViewDocuments=can('ged.view');
  const canViewVehicles=can('vehicles.view');
  const canViewHistory=can('customers.history.view');
  const documentsQuery=useEntityDocuments('customer',id,canViewDocuments),documents=documentsQuery.data??[];
  const canCreateSale=can('sales.create');
  const canCreateRepairOrder=can('service.order.create');
  const canUpdateCustomer=can('customers.update');

  const customer = data?.customer;
  const customerName=customer?(customer.type==='Professionnel'?(customer.company||[customer.firstName,customer.lastName].filter(Boolean).join(' ')||customer.code):[customer.civility,customer.firstName,customer.lastName].filter(Boolean).join(' ')):'';
  const [activeTab, setActiveTab] = useState<'timeline' | 'contacts' | 'opportunities' | 'vehicles' | 'sales' | 'sav' | 'billing' | 'documents'>('contacts');
  const tabs=[
    ...(canViewHistory?[{key:'timeline',label:`Timeline Événements (${total(data?.timeline)})`}]:[]),
    {key:'contacts',label:`Contacts (${contacts.length})`},
    ...(canViewCrm?[{key:'opportunities',label:`Opportunités (${total(data?.opportunities)})`}]:[]),
    ...(canViewVehicles?[{key:'vehicles',label:`Véhicules Rattachés (${total(data?.vehicles)})`}]:[]),
    ...(canViewSales||canViewQuotations?[{key:'sales',label:`Ventes & Devis (${total(data?.sales)+total(data?.quotations)})`}]:[]),
    ...(canViewService?[{key:'sav',label:`Atelier SAV & OR (${total(data?.repairOrders)})`}]:[]),
    ...(canViewBilling?[{key:'billing',label:`Facturation (${total(data?.invoices)})`}]:[]),
    ...(canViewDocuments?[{key:'documents',label:`Documents (${documents.length})`}]:[]),
  ] as const;
  const setCollectionPage=(key:Customer360PageKey,page:number)=>setPages(current=>({...current,[key]:page}));
  const changePageSize=(value:number)=>{if(!CUSTOMER_360_PAGE_SIZES.includes(value as (typeof CUSTOMER_360_PAGE_SIZES)[number]))return;setPageSize(value as (typeof CUSTOMER_360_PAGE_SIZES)[number]);setPages(newCustomer360Pages())};
  const activePaginationTotal=activeTab==='timeline'?total(data?.timeline):activeTab==='opportunities'?total(data?.opportunities):activeTab==='vehicles'?total(data?.vehicles):activeTab==='sales'?Math.max(total(data?.sales),total(data?.quotations)):activeTab==='sav'?total(data?.repairOrders):activeTab==='billing'?total(data?.invoices):0;
  const showPageSize=pageSize!==7||activePaginationTotal>7;
  useEffect(()=>{setPages(newCustomer360Pages())},[id]);
  useEffect(()=>{if(data)setPages(current=>synchronizeCustomer360Pages(current,data))},[data]);
  useEffect(()=>{if(!tabs.some(tab=>tab.key===activeTab))setActiveTab('contacts')},[activeTab,canViewHistory,canViewCrm,canViewVehicles,canViewSales,canViewQuotations,canViewService,canViewBilling,canViewDocuments]);
  const downloadDocument=async(document:(typeof documents)[number])=>{try{const blob=await apiDownload(`/documents/${document.id}/download`),url=URL.createObjectURL(blob),link=window.document.createElement('a');link.href=url;link.download=document.fileName;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}catch(error){addToast({type:'error',title:'Téléchargement impossible',description:error instanceof Error?error.message:'Erreur API'})}};
  const [contactOpen,setContactOpen]=useState(false);const createContact=useCreateCustomerContact(id);const[contact,setContact]=useState({firstName:'',lastName:'',roleTitle:'',email:'',phone:'',isPrimary:false});const[contactError,setContactError]=useState('');

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
        title={customerName}
        subtitle={`Code : ${customer.code} • ${customer.type} • ${customer.city} (${customer.zipCode})`}
        breadcrumbs={[
          { label: 'Accueil', href: '/dashboard' },
          { label: 'Clients', href: '/customers' },
          { label: customerName },
        ]}
        badge={<Badge variant={customer.type === 'Professionnel' ? 'primary' : 'default'} size="md">{customer.type}</Badge>}
        actions={
          <div className="flex items-center gap-2">
            {canCreateRepairOrder&&<Button
              variant="outline"
              size="sm"
              icon={<Wrench className="w-4 h-4" />}
              onClick={() => setActiveQuickActionModal('or',{customerId:customer.id})}
            >
              Nouveau RDV / OR
            </Button>}
            {canCreateSale&&<Button
              variant="primary"
              size="sm"
              icon={<BadgePercent className="w-4 h-4" />}
              onClick={() => setActiveQuickActionModal('sale',{customerId:customer.id})}
            >
              Créer Vente
            </Button>}
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
            {customer.phone&&<div className="flex items-center gap-2.5 text-slate-700">
              <Phone className="w-4 h-4 text-slate-400" />
              <a href={`tel:${customer.phone}`} className="font-semibold text-blue-600 hover:underline">
                {customer.phone}
              </a>
            </div>}
            {customer.email&&<div className="flex items-center gap-2.5 text-slate-700">
              <Mail className="w-4 h-4 text-slate-400" />
              <a href={`mailto:${customer.email}`} className="text-slate-800 hover:underline truncate">
                {customer.email}
              </a>
            </div>}
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
          {canViewVehicles&&<div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Véhicules Rattachés</span>
            <div className="text-xl font-bold text-slate-900 mt-1">{total(data?.vehicles)}</div>
          </div>}
          {canViewSales&&<div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Commandes Ventes</span>
            <div className="text-xl font-bold text-blue-700 mt-1">{total(data?.sales)}</div>
          </div>}
          {canViewService&&<div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Passages Atelier SAV</span>
            <div className="text-xl font-bold text-amber-700 mt-1">{total(data?.repairOrders)}</div>
          </div>}
          {canViewBilling&&<div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] text-slate-500 font-medium">Factures Émises</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">{total(data?.invoices)}</div>
          </div>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200">
        <div className="flex items-center gap-2 overflow-x-auto">
          {tabs.map((tab) => (
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
        {showPageSize&&<label className="mb-1 flex shrink-0 items-center gap-2 text-[11px] font-semibold text-slate-500">Éléments par page<select aria-label="Éléments par page" className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700" value={pageSize} onChange={event=>changePageSize(Number(event.target.value))}>{CUSTOMER_360_PAGE_SIZES.map(value=><option key={value} value={value}>{value}</option>)}</select></label>}
      </div>

      {/* TAB 1: TIMELINE */}
      {activeTab === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Journal d'Activité & Historique Relation Client 360°</CardTitle>
          </CardHeader>
          <div className="space-y-4 text-xs">{timeline.map((event:any)=><div key={`${event.event_type}-${event.reference_id}-${event.event_at}`} className="flex gap-3 items-start"><div className="w-8 h-8 rounded-full bg-slate-100 text-[#8f1722] flex items-center justify-center shrink-0"><Clock className="w-4 h-4"/></div><div><div className="font-bold text-slate-900">{event.title}</div><p className="text-slate-500 mt-0.5">{event.description||'—'}</p><span className="text-[10px] text-slate-400">{formatDate(event.event_at)}</span></div></div>)}{!timeline.length&&<p className="text-slate-500">Aucun événement enregistré pour ce client.</p>}</div>
          <CustomerPager data={data?.timeline} onPage={page=>setCollectionPage('timelinePage',page)} label="événement(s)"/>
        </Card>
      )}

      {activeTab === 'contacts' && <Card><CardHeader><div className="flex items-center justify-between"><CardTitle>Contacts du client</CardTitle>{canUpdateCustomer&&<Button size="xs" variant="primary" onClick={()=>setContactOpen(true)}>Ajouter un contact</Button>}</div></CardHeader><div className="space-y-2">{contacts.map((item:any)=><div key={item.id} className="p-3 border border-slate-200 rounded-lg text-xs"><div className="font-bold">{item.first_name} {item.last_name}{item.is_primary?' • Principal':''}</div><div className="text-slate-500">{item.role_title||'—'} • {item.phone||'—'} • {item.email||'—'}</div></div>)}{!contacts.length&&<p className="text-xs text-slate-500">Aucun contact enregistré.</p>}</div></Card>}

      {activeTab === 'opportunities' && <Card><CardHeader><CardTitle>Opportunités liées</CardTitle></CardHeader><div className="space-y-2">{opportunities.map((item:any)=><div key={item.id} className="flex flex-col gap-2 rounded-lg border border-slate-200 p-3 text-xs sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="truncate font-bold">{item.title}</div><div className="mt-1 text-blue-700">Score de qualification : {item.probability}%</div><div className="mt-1 text-violet-700">Progression commerciale : {item.commercialProgressState==='LOST'?'Vente perdue':item.commercialProgress==null?'Indisponible':`${item.commercialProgress} %`}</div></div><div className="font-semibold">{item.stage}</div></div>)}{!opportunities.length&&<p className="text-xs text-slate-500">Aucune opportunité rattachée.</p>}</div><CustomerPager data={data?.opportunities} onPage={page=>setCollectionPage('opportunitiesPage',page)} label="opportunité(s)"/></Card>}

      {activeTab === 'documents' && <Card><CardHeader><CardTitle>Documents client actifs</CardTitle></CardHeader><div className="divide-y text-xs">{documents.map(document=><div key={document.id} className="flex items-center justify-between py-3"><div><b>{document.fileName}</b><div className="text-slate-500">{document.documentType} · {Math.ceil(document.fileSize/1024)} Ko · {formatDate(document.createdAt)}</div></div><Button size="xs" variant="outline" onClick={()=>downloadDocument(document)}>Télécharger</Button></div>)}{!documents.length&&<p className="py-5 text-slate-500">Aucun document client actif.</p>}</div></Card>}

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
              {canCreateRepairOrder&&<Button size="xs" variant="outline" onClick={() => setActiveQuickActionModal('or',{customerId:customer.id,vehicleId:v.id})}>
                Ouvrir un OR SAV
              </Button>}
            </div>
          ))}
          {customerVehicles.length === 0 && (
            <div className="p-8 bg-white rounded-xl border border-slate-200 text-center text-slate-400 text-xs">
              Aucun véhicule rattaché pour le moment.
            </div>
          )}
          <CustomerPager data={data?.vehicles} onPage={page=>setCollectionPage('vehiclesPage',page)} label="véhicule(s)"/>
        </div>
      )}

      {/* TAB 3: SALES */}
      {activeTab === 'sales' && (
        <Card padding="none">
          {customerQuotations.length>0&&<div className="border-b bg-slate-50 p-4"><div className="mb-2 text-xs font-bold uppercase text-slate-500">Devis</div><div className="grid gap-2 md:grid-cols-2">{customerQuotations.map((quotation:any)=><div key={quotation.id} className="rounded-lg border bg-white p-3 text-xs"><div className="flex justify-between gap-3"><b>{quotation.quotationNumber}</b><span className="font-bold">{formatCurrency(quotation.total)}</span></div><div className="mt-1 text-slate-500">{quotation.vehicleLabel} · {quotationStatusLabel(quotation.status)}</div><div className="mt-1 text-[10px] text-slate-400">Commercial : {quotation.salespersonName||'Non affecté'} · Créé par : {quotation.createdByName||'Système'}</div></div>)}</div></div>}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">N° Commande</th>
                  <th className="py-2.5 px-4">Véhicule</th>
                  <th className="py-2.5 px-4">Montant TTC</th>
                  <th className="py-2.5 px-4">Payé</th>
                  <th className="py-2.5 px-4">Reste</th>
                  <th className="py-2.5 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customerSales.map((s) => (
                  <tr key={s.id} onClick={() => navigate(`/sales/${s.id}`)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();navigate(`/sales/${s.id}`)}}} role="link" tabIndex={0} aria-label={`Ouvrir la vente ${s.saleNumber}`} className="hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 cursor-pointer">
                    <td className="py-2.5 px-4 font-bold text-blue-700">{s.saleNumber}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{s.vehicleLabel}</td>
                    <td className="py-2.5 px-4 font-bold">{formatCurrency(s.totalSaleTTC)}</td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-700">{formatCurrency(s.paidAmountTTC??0)}</td>
                    <td className="py-2.5 px-4 font-semibold text-rose-700">{formatCurrency(s.remainingBalanceTTC??0)}</td>
                    <td className="py-2.5 px-4"><StatusBadge status={s.status} type="sale" /></td>
                  </tr>
                ))}
                {!customerSales.length&&<tr><td colSpan={6} className="p-8 text-center text-slate-500">Aucune vente enregistrée.</td></tr>}
              </tbody>
            </table>
          </div>
          <CustomerPager data={data?.sales} onPage={page=>setCollectionPage('salesPage',page)} label="vente(s)"/>
          {customerQuotations.length>0&&<CustomerPager data={data?.quotations} onPage={page=>setCollectionPage('quotationsPage',page)} label="devis"/>}
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
                  <tr key={orItem.id} onClick={() => navigate(`/service/repair-orders/${orItem.id}`)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();navigate(`/service/repair-orders/${orItem.id}`)}}} role="link" tabIndex={0} aria-label={`Ouvrir l’ordre de réparation ${orItem.orNumber}`} className="hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500 cursor-pointer">
                    <td className="py-2.5 px-4 font-bold text-blue-700">{orItem.orNumber}</td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">{orItem.vehicleModel} ({orItem.vehiclePlate})</td>
                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-xs">{orItem.symptomsReported}</td>
                    <td className="py-2.5 px-4 font-bold">{formatCurrency(orItem.finalTotalTTC)}</td>
                    <td className="py-2.5 px-4"><StatusBadge status={orItem.status} type="or" /></td>
                  </tr>
                ))}
                {!customerORs.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucun ordre de réparation enregistré.</td></tr>}
              </tbody>
            </table>
          </div>
          <CustomerPager data={data?.repairOrders} onPage={page=>setCollectionPage('repairOrdersPage',page)} label="ordre(s) de réparation"/>
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
                {!customerInvoices.length&&<tr><td colSpan={5} className="p-8 text-center text-slate-500">Aucune facture enregistrée.</td></tr>}
              </tbody>
            </table>
          </div>
          <CustomerPager data={data?.invoices} onPage={page=>setCollectionPage('invoicesPage',page)} label="facture(s)"/>
        </Card>
      )}
      <Modal isOpen={contactOpen} onClose={()=>{setContactOpen(false);setContactError('')}} title="Ajouter un contact" maxWidth="lg">
        <form noValidate className="space-y-3" onSubmit={async e=>{e.preventDefault();if(!contact.firstName.trim()||!contact.lastName.trim()){setContactError('Le prénom et le nom sont obligatoires.');return}setContactError('');await createContact.mutateAsync(contact);setContactOpen(false);setContact({firstName:'',lastName:'',roleTitle:'',email:'',phone:'',isPrimary:false})}}>
          <div className="grid grid-cols-2 gap-3"><input placeholder="Prénom *" value={contact.firstName} onChange={e=>{setContact({...contact,firstName:e.target.value});setContactError('')}} className="text-xs p-2.5 border rounded-lg"/><input placeholder="Nom *" value={contact.lastName} onChange={e=>{setContact({...contact,lastName:e.target.value});setContactError('')}} className="text-xs p-2.5 border rounded-lg"/><input placeholder="Fonction" value={contact.roleTitle} onChange={e=>setContact({...contact,roleTitle:e.target.value})} className="text-xs p-2.5 border rounded-lg"/><input placeholder="Téléphone" value={contact.phone} onChange={e=>setContact({...contact,phone:e.target.value})} className="text-xs p-2.5 border rounded-lg"/><input type="text" inputMode="email" placeholder="E-mail" value={contact.email} onChange={e=>setContact({...contact,email:e.target.value})} className="text-xs p-2.5 border rounded-lg col-span-2"/></div>
          {contactError&&<p className="text-xs text-red-700">{contactError}</p>}
          <label className="text-xs flex gap-2"><input type="checkbox" checked={contact.isPrimary} onChange={e=>setContact({...contact,isPrimary:e.target.checked})}/>Contact principal</label><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={()=>{setContactOpen(false);setContactError('')}}>Annuler</Button><Button type="submit" variant="primary" loading={createContact.isPending}>Enregistrer</Button></div>
        </form>
      </Modal>
    </div>
  );
};

const CustomerPager=({data,onPage,label}:{data:any;onPage:(page:number)=>void;label:string})=>{if(Array.isArray(data)||!data)return null;const page=Math.max(1,Number(data.page)||1),totalPages=Math.max(1,Number(data.totalPages)||1);return <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs"><span>{data.total??0} {label}</span><div className="flex flex-wrap items-center justify-end gap-2"><Button size="xs" variant="outline" disabled={page<=1} aria-label="Première page" onClick={()=>onPage(1)}>Première</Button><Button size="xs" variant="outline" disabled={page<=1} onClick={()=>onPage(page-1)}>Précédent</Button><span>Page {page} / {totalPages}</span><Button size="xs" variant="outline" disabled={page>=totalPages} onClick={()=>onPage(page+1)}>Suivant</Button><Button size="xs" variant="outline" disabled={page>=totalPages} aria-label="Dernière page" onClick={()=>onPage(totalPages)}>Dernière</Button></div></div>};
