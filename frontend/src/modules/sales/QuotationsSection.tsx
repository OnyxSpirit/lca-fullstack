import React, { useEffect, useState } from 'react';
import { useQuotationsPageQuery, useRetryQuotationArchive } from '../../api/erpHooks';
import { TableEmptyState } from '../../components/common/TableEmptyState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import { businessArchiveStatusLabel } from '../../services/businessArchiveStatus';
import { openBusinessPdf } from '../../services/businessPdf';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';

export function QuotationsSection() {
  const [page, setPage] = useState(1);
  const [sortBy,setSortBy]=useState('date');
  const [sortOrder,setSortOrder]=useState<'asc'|'desc'>('desc');
  const canView = useAuthStore((state) => state.can('quotations.view'));
  const canValidate = useAuthStore((state) => state.can('quotations.validate'));
  const query = useQuotationsPageQuery({ page, pageSize: 7, sortBy, sortOrder }, canView);
  const retryArchive = useRetryQuotationArchive();
  const addToast = useUiStore((state) => state.addToast);
  const quotations = query.data?.items ?? [];

  useEffect(() => {
    if (query.data && query.data.page !== page) setPage(query.data.page);
  }, [query.data, page]);

  return (
    <Card padding="none">
      <div className="border-b p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-slate-900">Propositions et devis</h2><div className="flex gap-2"><select aria-label="Trier les devis" value={sortBy} onChange={event=>{setSortBy(event.target.value);setPage(1)}} className="rounded border px-2 py-1 text-xs"><option value="date">Date</option><option value="reference">Référence</option><option value="client">Client</option><option value="amount">Montant</option><option value="validUntil">Validité</option></select><Button size="xs" variant="outline" aria-label="Inverser le sens du tri des devis" onClick={()=>{setSortOrder(value=>value==='asc'?'desc':'asc');setPage(1)}}>{sortOrder==='asc'?'↑ Croissant':'↓ Décroissant'}</Button></div></div>
        <p className="text-xs text-slate-500">Même source de vérité que les devis créés depuis le CRM.</p>
      </div>
      {query.isError && (
        <div className="p-4 text-sm text-red-700">
          Chargement des devis impossible : {query.error instanceof Error ? query.error.message : 'Erreur API'}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50">
            <tr>
              <th className="p-3">Référence</th><th>Client</th><th>Véhicule</th><th>Commercial</th><th>Montant</th><th>Statut</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {query.isLoading && <TableEmptyState colSpan={7} message="Chargement des devis..." isLoading />}
            {quotations.map((quote) => (
              <tr key={quote.id} className="border-t">
                <td className="p-3 font-mono font-bold">{quote.quotationNumber}</td>
                <td>{quote.customerName}</td>
                <td>{quote.vehicleLabel}</td>
                <td>{quote.salespersonName}</td>
                <td>{formatCurrency(quote.total)}</td>
                <td>
                  <div>{quote.status}</div>
                  {quote.identitySnapshot && (
                    <div className={quote.archiveAvailable ? 'text-[10px] text-emerald-700' : 'text-[10px] text-amber-700'}>
                      {retryArchive.variables === quote.id && retryArchive.isPending
                        ? 'Archivage en cours'
                        : retryArchive.variables === quote.id && retryArchive.isError
                          ? 'Archivage en échec'
                          : businessArchiveStatusLabel(quote.archiveStatus)}
                    </div>
                  )}
                </td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={Boolean(quote.identitySnapshot && !quote.archiveAvailable)}
                      onClick={() => openBusinessPdf('quotation', quote.id).catch((error) => addToast({ type: 'error', title: 'PDF indisponible', description: error.message }))}
                    >
                      PDF
                    </Button>
                    {canValidate && Boolean(quote.identitySnapshot) && quote.archiveStatus === 'MISSING_RECORD' && ['sent', 'negotiation'].includes(quote.status) && (
                      <Button
                        size="xs"
                        loading={retryArchive.isPending && retryArchive.variables === quote.id}
                        disabled={retryArchive.isPending}
                        onClick={() => retryArchive.mutateAsync(quote.id)
                          .then(() => addToast({ type: 'success', title: 'Archive officielle finalisée' }))
                          .catch((error) => addToast({ type: 'error', title: 'Archivage toujours indisponible', description: error instanceof Error ? error.message : 'Erreur API' }))}
                      >
                        Finaliser l’archivage
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!query.isLoading && !query.isError && quotations.length === 0 && <TableEmptyState colSpan={7} message="Aucun devis" />}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 border-t p-3 text-xs">
        <span>{query.data?.total ?? 0} devis</span>
        <div className="flex items-center gap-2">
          <Button size="xs" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Précédent</Button>
          <span>Page {page}/{Math.max(1, query.data?.totalPages ?? 1)}</span>
          <Button size="xs" variant="outline" disabled={page >= (query.data?.totalPages ?? 1)} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
        </div>
      </div>
    </Card>
  );
}
