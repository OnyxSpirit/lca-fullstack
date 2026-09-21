import React, { useEffect, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGlobalSearchQuery } from "../../api/dashboardHooks";
import { useUiStore } from "../../stores/uiStore";

const labels: Record<string, string> = {
  customer: "Clients",
  vehicle: "Véhicules",
  lead: "Prospects",
  sale: "Ventes",
  invoice: "Factures",
  repair_order: "Ordres de réparation",
  part: "Pièces",
};
export const GlobalSearchModal: React.FC = () => {
  const { globalSearchOpen, setGlobalSearchOpen } = useUiStore(),
    [query, setQuery] = useState(""),
    [debounced, setDebounced] = useState(""),
    navigate = useNavigate();
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setGlobalSearchOpen(!globalSearchOpen);
      }
      if (e.key === "Escape") setGlobalSearchOpen(false);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [globalSearchOpen, setGlobalSearchOpen]);
  useEffect(() => {
    if (globalSearchOpen) setQuery("");
  }, [globalSearchOpen]);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const results = useGlobalSearchQuery(debounced, globalSearchOpen);
  if (!globalSearchOpen) return null;
  const select = (route: string) => {
    setGlobalSearchOpen(false);
    navigate(route);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-16 sm:pt-24">
      <button
        aria-label="Fermer la recherche"
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={() => setGlobalSearchOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recherche globale"
        className="relative z-10 flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border bg-white shadow-2xl"
      >
        <div className="flex items-center border-b bg-slate-50/50 px-4 py-3.5">
          <Search className="mr-3 h-5 w-5 shrink-0 text-[#8f1722]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Client, VIN, prospect, vente, OR, facture ou pièce…"
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {query && (
            <button
              aria-label="Effacer"
              onClick={() => setQuery("")}
              className="p-1 text-slate-400"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto p-4">
          {query.trim().length < 2 && (
            <p className="py-8 text-center text-xs text-slate-500">
              Saisissez au moins deux caractères.
            </p>
          )}
          {results.isLoading && (
            <p className="py-8 text-center text-xs text-slate-500">
              Recherche en cours…
            </p>
          )}
          {results.isError && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              {results.error instanceof Error
                ? results.error.message
                : "Recherche indisponible"}
            </p>
          )}
          {!results.isLoading &&
            debounced.length >= 2 &&
            !results.data?.length && (
              <p className="py-8 text-center text-xs text-slate-500">
                Aucun résultat pour « {debounced} ».
              </p>
            )}
          {results.data?.map((item) => (
            <button
              type="button"
              key={`${item.type}-${item.id}`}
              onClick={() => select(item.route)}
              className="flex w-full items-center justify-between rounded-lg p-3 text-left text-xs hover:bg-slate-50"
            >
              <span>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#8f1722]">
                  {labels[item.type] ?? item.type}
                </span>
                <strong className="text-slate-900">{item.label}</strong>
                {item.secondary && (
                  <span className="ml-2 text-slate-500">{item.secondary}</span>
                )}
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
