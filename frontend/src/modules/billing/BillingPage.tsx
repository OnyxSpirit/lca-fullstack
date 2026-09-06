import React, { useEffect, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useBillingConfigQuery, useInvoicesQuery } from '../../api/erpHooks';
import { PageHeader } from '../../components/common/PageHeader';
import { TableEmptyState } from '../../components/common/TableEmptyState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../../lib/utils';
import { apiDownload } from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import { NewInvoiceModal } from './NewInvoiceModal';

export const BillingPage: React.FC = () => {
  const navigate = useNavigate(), toast = useUiStore((state) => state.addToast), agency = useAuthStore((state) => state.currentAgency);
  const canCreate = useAuthStore((state) => state.hasPermission('create', 'billing')), canExport = useAuthStore((state) => state.hasPermission('export', 'billing'));
  const [open, setOpen] = useState(false), [search, setSearch] = useState(''), [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState(''), [type, setType] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState('');
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(search.trim()), 300); return () => window.clearTimeout(timer); }, [search]);
  const query = useInvoicesQuery({ agencyId: agency?.id ?? '', search: debounced, status, type, from, to });
  const config = useBillingConfigQuery(agency?.id), invoices = query.data ?? [], active = invoices.filter((x) => x.status !== 'ANNULEE');
  const currency = config.data?.currencyCode ?? invoices[0]?.currencyCode, money = (amount: number) => currency ? formatCurrency(amount, currency) : '—';
  const billed = active.reduce((sum, x) => sum + x.amountTTC, 0), paid = active.reduce((sum, x) => sum + x.paidAmountTTC, 0), due = active.reduce((sum, x) => sum + x.remainingAmountTTC, 0);
  const overdue = active.filter((x) => x.status === 'EN_RETARD').reduce((sum, x) => sum + x.remainingAmountTTC, 0), hasFilters = Boolean(debounced || status || type || from || to);
  async function exportCsv() { if (!agency?.id) return; try { const params = new URLSearchParams({ agencyId: agency.id }); if (from) params.set('from', from); if (to) params.set('to', to); const blob = await apiDownload(`/invoices/export/accounting?${params}`), url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = 'journal-comptable.csv'; anchor.click(); URL.revokeObjectURL(url); } catch (error) { toast({ type: 'error', title: 'Export impossible', description: error instanceof Error ? error.message : 'Erreur API' }); } }
  return <div className="space-y-6">
    <PageHeader title="Facturation, Encaissements & Règlements" subtitle={`Factures, créances et règlements${config.data?.currencyCode ? ` en ${config.data.currencyCode}` : ''}.`} breadcrumbs={[{ label: 'Accueil', href: '/dashboard' }, { label: 'Facturation' }]} actions={<div className="flex gap-2">{canExport && <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />} onClick={exportCsv} disabled={!agency?.id}>Export journal comptable</Button>}{canCreate && <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)} disabled={!agency?.id}>Créer facture</Button>}</div>} />
    <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">{[['CA facturé', money(billed)], ['Encaissé', money(paid)], ['Reste dû', money(due)], ['Échu', money(overdue)], ['Taux encaissement', billed ? `${(paid / billed * 100).toFixed(1)} %` : '0 %']].map(([label, value]) => <Card key={label}><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold mt-1">{value}</p></Card>)}</div>
    <div className="flex flex-wrap gap-2 bg-white p-3 border rounded-xl"><div className="relative flex-1 min-w-64"><Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" /><input className="w-full pl-9 p-2 text-xs border rounded" placeholder="Facture, client, vente ou OR" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select className="p-2 text-xs border rounded" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Tous statuts</option><option value="issued">Émise</option><option value="partially_paid">Partiellement payée</option><option value="paid">Soldée</option><option value="overdue">Échue</option><option value="cancelled">Annulée</option></select><select className="p-2 text-xs border rounded" value={type} onChange={(e) => setType(e.target.value)}><option value="">Tous types</option><option value="vehicle">Véhicule</option><option value="workshop">Atelier</option><option value="parts">Pièces</option><option value="manual">Manuelle</option></select><input type="date" className="p-2 text-xs border rounded" value={from} onChange={(e) => setFrom(e.target.value)} /><input type="date" className="p-2 text-xs border rounded" value={to} onChange={(e) => setTo(e.target.value)} /></div>
    {query.isError && <p className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700">Chargement des factures impossible : {query.error instanceof Error ? query.error.message : 'Erreur API'}</p>}
    <Card padding="none"><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Facture</th><th>Client</th><th>Type / Source</th><th>Émission / Échéance</th><th>Total</th><th>Encaissé</th><th>Reste</th><th>Statut</th><th></th></tr></thead><tbody>
      {query.isLoading && <TableEmptyState colSpan={9} message="Chargement des factures..." isLoading />}
      {!query.isLoading && !query.isError && invoices.length === 0 && <TableEmptyState colSpan={9} message={hasFilters ? 'Aucune facture ne correspond à vos critères' : 'Aucune facture'} />}
      {invoices.map((x) => <tr key={x.id} className="border-t hover:bg-red-50/30 cursor-pointer" onClick={() => navigate(`/billing/${x.id}`)}><td className="p-3 font-mono font-bold">{x.invoiceNumber}</td><td>{x.customerName}</td><td>{x.type}<small className="block text-slate-500">{x.relatedDocNumber || 'Manuelle'}</small></td><td>{formatDate(x.issueDate)}<small className="block text-slate-500">{x.dueDate ? formatDate(x.dueDate) : '—'}</small></td><td>{money(x.amountTTC)}</td><td>{money(x.paidAmountTTC)}</td><td className="font-bold">{money(x.remainingAmountTTC)}</td><td><StatusBadge status={x.status} type="invoice" /></td><td><Button size="xs" variant="outline" onClick={(e) => { e.stopPropagation(); navigate(`/billing/${x.id}`); }}>Détails</Button></td></tr>)}
    </tbody></table></div></Card>{canCreate && <NewInvoiceModal isOpen={open} onClose={() => setOpen(false)} />}
  </div>;
};
