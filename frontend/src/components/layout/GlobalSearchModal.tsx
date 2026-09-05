import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  User,
  Car,
  FileText,
  Wrench,
  Receipt,
  Package,
  ArrowRight,
  X,
} from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useCustomersQuery, useInvoicesQuery, useLeadsQuery, usePartsQuery, useRepairOrdersQuery, useSalesQuery, useVehiclesQuery } from '../../api/erpHooks';
import { formatCurrency } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';

export const GlobalSearchModal: React.FC = () => {
  const { globalSearchOpen, setGlobalSearchOpen } = useUiStore();
  const agencyId=useAuthStore(s=>s.currentAgency?.id);const customers=useCustomersQuery().data??[],vehicles=useVehiclesQuery().data??[],leads=useLeadsQuery().data??[],sales=useSalesQuery().data??[],repairOrders=useRepairOrdersQuery().data??[],invoices=useInvoicesQuery().data??[],spareParts=usePartsQuery(agencyId).data??[];
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  // Reset query on open
  useEffect(() => {
    if (globalSearchOpen) setQuery('');
  }, [globalSearchOpen]);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;

    const matchedCustomers = customers.filter(
      (c) =>
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.company && c.company.toLowerCase().includes(q))
    ).slice(0, 4);

    const matchedVehicles = vehicles.filter(
      (v) =>
        v.brand.toLowerCase().includes(q) ||
        v.model.toLowerCase().includes(q) ||
        v.vin.toLowerCase().includes(q) ||
        v.registrationNumber.toLowerCase().includes(q) ||
        v.stockNumber.toLowerCase().includes(q)
    ).slice(0, 4);

    const matchedLeads = leads.filter(
      (l) =>
        l.firstName.toLowerCase().includes(q) ||
        l.lastName.toLowerCase().includes(q) ||
        l.targetVehicle.toLowerCase().includes(q) ||
        l.email.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedORs = repairOrders.filter(
      (o) =>
        o.orNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.vehiclePlate.toLowerCase().includes(q) ||
        o.vehicleModel.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedSales = sales.filter(
      (s) =>
        s.saleNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.vehicleLabel.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedInvoices = invoices.filter(
      (inv) =>
        inv.invoiceNumber.toLowerCase().includes(q) ||
        inv.customerName.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedParts = spareParts.filter(
      (p) =>
        p.reference.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.oemReference.toLowerCase().includes(q)
    ).slice(0, 3);

    const totalCount =
      matchedCustomers.length +
      matchedVehicles.length +
      matchedLeads.length +
      matchedORs.length +
      matchedSales.length +
      matchedInvoices.length +
      matchedParts.length;

    return {
      totalCount,
      customers: matchedCustomers,
      vehicles: matchedVehicles,
      leads: matchedLeads,
      repairOrders: matchedORs,
      sales: matchedSales,
      invoices: matchedInvoices,
      parts: matchedParts,
    };
  }, [query, customers, vehicles, leads, repairOrders, sales, invoices, spareParts]);

  if (!globalSearchOpen) return null;

  const handleSelect = (path: string) => {
    setGlobalSearchOpen(false);
    navigate(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setGlobalSearchOpen(false)}
      />

      {/* Search box container */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 z-10 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-100 bg-slate-50/50">
          <Search className="w-5 h-5 text-blue-600 shrink-0 mr-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher par client, VIN, immatriculation, n° OR, facture, pièce..."
            autoFocus
            className="flex-1 bg-transparent text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md mr-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs text-slate-500 bg-white border border-slate-200 rounded font-semibold shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div className="overflow-y-auto p-4 space-y-4 flex-1">
          {!query && (
            <div className="py-8 text-center text-slate-400 text-xs space-y-2">
              <p className="font-semibold text-slate-600">Recherche globale dans toute la concession</p>
              <p>Essayez « Toyota », « Dupont », « OR-2026 », « WBA », « Bougie » ou « Facture »</p>
              <div className="flex justify-center gap-2 pt-2">
                <span className="px-2 py-1 bg-slate-100 rounded text-[11px] text-slate-600 cursor-pointer hover:bg-slate-200" onClick={() => setQuery('BMW')}>BMW</span>
                <span className="px-2 py-1 bg-slate-100 rounded text-[11px] text-slate-600 cursor-pointer hover:bg-slate-200" onClick={() => setQuery('Dupont')}>Dupont</span>
                <span className="px-2 py-1 bg-slate-100 rounded text-[11px] text-slate-600 cursor-pointer hover:bg-slate-200" onClick={() => setQuery('Hybride')}>Hybride</span>
                <span className="px-2 py-1 bg-slate-100 rounded text-[11px] text-slate-600 cursor-pointer hover:bg-slate-200" onClick={() => setQuery('Frein')}>Frein</span>
              </div>
            </div>
          )}

          {query && searchResults && searchResults.totalCount === 0 && (
            <div className="py-8 text-center text-slate-400 text-xs">
              Aucun résultat trouvé pour « <span className="font-semibold text-slate-700">{query}</span> ».
            </div>
          )}

          {searchResults && searchResults.totalCount > 0 && (
            <div className="space-y-4">
              {/* Customers */}
              {searchResults.customers.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Clients ({searchResults.customers.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.customers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelect(`/customers/${c.id}`)}
                        className="p-2.5 rounded-lg hover:bg-blue-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-blue-700">
                            {c.civility} {c.firstName} {c.lastName}
                          </span>
                          {c.company && <span className="text-slate-500 ml-1.5">({c.company})</span>}
                          <div className="text-[11px] text-slate-400">{c.code} • {c.city} • {c.phone}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles */}
              {searchResults.vehicles.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-emerald-600" />
                    Véhicules en Parc ({searchResults.vehicles.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.vehicles.map((v) => (
                      <div
                        key={v.id}
                        onClick={() => handleSelect(`/vehicles/${v.id}`)}
                        className="p-2.5 rounded-lg hover:bg-emerald-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-emerald-700">
                            {v.brand} {v.model} — {v.version}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            VIN: {v.vin} • Immat: {v.registrationNumber} • {formatCurrency(v.sellingPriceTTC)}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Repair Orders */}
              {searchResults.repairOrders.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-600" />
                    Ordres de Réparation ({searchResults.repairOrders.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.repairOrders.map((o) => (
                      <div
                        key={o.id}
                        onClick={() => handleSelect(`/service/repair-orders/${o.id}`)}
                        className="p-2.5 rounded-lg hover:bg-amber-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-amber-700">
                            {o.orNumber} — {o.vehicleModel} ({o.vehiclePlate})
                          </span>
                          <div className="text-[11px] text-slate-400">Client: {o.customerName} • Statut: {o.status}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Invoices */}
              {searchResults.invoices.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-purple-600" />
                    Factures & Avoirs ({searchResults.invoices.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        onClick={() => handleSelect(`/billing`)}
                        className="p-2.5 rounded-lg hover:bg-purple-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-purple-700">
                            {inv.invoiceNumber} — {inv.customerName}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            Montant: {formatCurrency(inv.amountTTC)} • Statut: {inv.status}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Spare Parts */}
              {searchResults.parts.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-cyan-600" />
                    Pièces de Rechange ({searchResults.parts.length})
                  </div>
                  <div className="space-y-1">
                    {searchResults.parts.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => handleSelect(`/parts/${p.id}`)}
                        className="p-2.5 rounded-lg hover:bg-cyan-50/80 cursor-pointer flex items-center justify-between text-xs transition-colors group"
                      >
                        <div>
                          <span className="font-semibold text-slate-800 group-hover:text-cyan-700">
                            {p.reference} — {p.name}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            Casier: {p.locationBin} • En stock: {p.stockQuantity} • {formatCurrency(p.sellingPriceHT)} HT
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
