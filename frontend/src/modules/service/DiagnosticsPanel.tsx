import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../../services/apiClient';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Badge } from '../../components/ui/Badge';
import { TableEmptyState } from '../../components/common/TableEmptyState';
import { ServerPagination } from '../../components/common/ServerPagination';
import { promptAction } from '../../components/ui/BusinessDialog';
import { formatCurrency } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';

type DiagnosticItem = {
  id: string;
  item_type: 'part' | 'labor';
  part_reference?: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  line_total: number;
};
type Diagnostic = {
  id: string;
  diagnostic_number: string;
  customer_name: string;
  vehicle_label: string;
  registration_number?: string;
  vin?: string;
  quotation_number?: string;
  status: string;
  subtotal: number;
  tax_total: number;
  total: number;
  repair_order_id?: string | null;
  diagnosis_summary?: string;
  tax_mode: string;
  items?: DiagnosticItem[];
};
type DiagnosticPage = {
  items: Diagnostic[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function DiagnosticsPanel() {
  const can = useAuthStore((state) => state.can);
  const toast = useUiStore((state) => state.addToast);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');

  const list = useQuery({
    queryKey: ['service-diagnostics', page, pageSize, search],
    queryFn: () =>
      apiRequest<DiagnosticPage>(
        `/service-diagnostics?page=${page}&pageSize=${pageSize}&search=${encodeURIComponent(search)}`,
      ),
  });
  const detail = useQuery({
    queryKey: ['service-diagnostic', selected],
    queryFn: () => apiRequest<Diagnostic>(`/service-diagnostics/${selected}`),
    enabled: Boolean(selected),
  });
  const run = useMutation({
    mutationFn: ({
      path,
      method = 'POST',
      body = {},
    }: {
      path: string;
      method?: string;
      body?: unknown;
    }) => apiRequest(path, { method, body: JSON.stringify(body) }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['service-diagnostics'] });
      if (selected) {
        await queryClient.invalidateQueries({ queryKey: ['service-diagnostic', selected] });
      }
    },
  });

  const action = async (work: () => Promise<unknown>, title: string) => {
    try {
      await work();
      toast({ type: 'success', title });
    } catch (error) {
      toast({
        type: 'error',
        title: 'Opération impossible',
        description: error instanceof Error ? error.message : 'Erreur API',
      });
    }
  };
  const finalize = async () => {
    const summary = await promptAction('Conclusion du diagnostic', {
      description: 'Décrivez les constats et recommandations techniques.',
    });
    if (!summary) return;
    await action(
      () =>
        run.mutateAsync({
          path: `/service-diagnostics/${selected}`,
          method: 'PATCH',
          body: { status: 'FINALIZED', diagnosisSummary: summary },
        }),
      'Diagnostic finalisé',
    );
  };
  const addItem = async (type: 'labor' | 'part') => {
    let partId: number | undefined;
    if (type === 'part') {
      const rawPartId = await promptAction('Identifiant de la pièce', {
        description: 'Saisissez l’identifiant de la pièce du catalogue.',
        inputType: 'number',
      });
      if (!rawPartId) return;
      partId = Number(rawPartId);
      if (!Number.isInteger(partId) || partId <= 0) return;
    }
    const description = await promptAction(
      type === 'labor' ? 'Prestation de main-d’œuvre' : 'Désignation de la pièce',
    );
    if (!description) return;
    const quantity = Number(
      await promptAction(type === 'labor' ? 'Nombre d’heures' : 'Quantité', {
        inputType: 'number',
        defaultValue: '1',
      }),
    );
    const unitPrice = Number(
      await promptAction('Prix unitaire HT', { inputType: 'number', defaultValue: '0' }),
    );
    const discount = Number(
      await promptAction('Remise HT', { inputType: 'number', defaultValue: '0' }),
    );
    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isFinite(unitPrice) ||
      unitPrice < 0 ||
      !Number.isFinite(discount) ||
      discount < 0
    )
      return;
    await action(
      () =>
        run.mutateAsync({
          path: `/service-diagnostics/${selected}/items`,
          body: { itemType: type, partId, description, quantity, unitPrice, discount },
        }),
      'Chiffrage actualisé',
    );
  };
  const issue = async (taxMode: 'TAXABLE' | 'TAX_EXEMPT') => {
    const taxJustification =
      taxMode === 'TAX_EXEMPT'
        ? await promptAction('Justification de l’exonération', {
            description: 'Cette justification sera conservée dans le devis et l’ordre de réparation.',
          })
        : undefined;
    if (taxMode === 'TAX_EXEMPT' && !taxJustification) return;
    await action(
      () =>
        run.mutateAsync({
          path: `/service-diagnostics/${selected}/issue`,
          body: { taxMode, taxJustification },
        }),
      'Devis émis',
    );
  };
  const refuse = async () =>
    action(
      () =>
        run.mutateAsync({
          path: `/service-diagnostics/${selected}`,
          method: 'PATCH',
          body: { status: 'REFUSED' },
        }),
      'Refus du devis enregistré',
    );
  const accept = async () =>
    action(async () => {
      const result = (await run.mutateAsync({
        path: `/service-diagnostics/${selected}/accept`,
      })) as { id?: string };
      if (result.id) navigate(`/service/repair-orders/${result.id}`);
    }, 'Acceptation enregistrée et OR créé');

  return (
    <div className="space-y-4">
      <input
        className="w-full max-w-lg rounded border p-2 text-xs"
        placeholder="Diagnostic, devis, client, VIN ou immatriculation"
        value={search}
        onChange={(event) => {
          setSearch(event.target.value);
          setPage(1);
        }}
      />
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="p-3">Diagnostic</th><th>Client</th><th>Véhicule</th>
                <th>Devis</th><th>Montant</th><th>Statut</th><th />
              </tr>
            </thead>
            <tbody>
              {list.data?.items.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-3 font-mono">{item.diagnostic_number}</td>
                  <td>{item.customer_name}</td>
                  <td>{item.vehicle_label || item.registration_number || item.vin}</td>
                  <td>{item.quotation_number || 'Non émis'}</td>
                  <td>{formatCurrency(Number(item.total))}</td>
                  <td><Badge>{item.status}</Badge></td>
                  <td><Button size="xs" variant="outline" onClick={() => setSelected(item.id)}>Ouvrir</Button></td>
                </tr>
              ))}
              {!list.isLoading && !list.data?.items.length && (
                <TableEmptyState colSpan={7} message="Aucun diagnostic" />
              )}
            </tbody>
          </table>
        </div>
        <ServerPagination
          page={page}
          pageSize={pageSize}
          total={list.data?.total ?? 0}
          totalPages={list.data?.totalPages}
          loading={list.isFetching}
          label="diagnostic(s)"
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </Card>
      <Modal
        isOpen={Boolean(selected)}
        onClose={() => setSelected('')}
        title={detail.data?.diagnostic_number ?? 'Diagnostic'}
        maxWidth="xl"
      >
        {detail.data && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Card><b>Client</b><p>{detail.data.customer_name}</p></Card>
              <Card><b>Véhicule</b><p>{detail.data.vehicle_label}</p></Card>
              <Card><b>Statut</b><p>{detail.data.status}</p></Card>
            </div>
            {detail.data.diagnosis_summary && (
              <p className="rounded bg-slate-50 p-3 text-sm">{detail.data.diagnosis_summary}</p>
            )}
            <Card padding="none">
              <table className="w-full text-xs">
                <thead><tr><th className="p-2 text-left">Élément</th><th>Quantité</th><th>Prix HT</th><th>TVA</th><th>Total HT</th></tr></thead>
                <tbody>
                  {detail.data.items?.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.description}</td><td>{item.quantity}</td>
                      <td>{formatCurrency(Number(item.unit_price))}</td><td>{item.tax_rate}%</td>
                      <td>{formatCurrency(Number(item.line_total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span>Sous-total : <b>{formatCurrency(Number(detail.data.subtotal))}</b></span>
              <span>TVA : <b>{formatCurrency(Number(detail.data.tax_total))}</b></span>
              <span>Total : <b>{formatCurrency(Number(detail.data.total))}</b></span>
            </div>
            <div className="flex flex-wrap gap-2">
              {can('service.diagnostic.prepare') && ['RECEIVED', 'IN_PROGRESS'].includes(detail.data.status) && (
                <Button onClick={() => void finalize()}>Finaliser le diagnostic</Button>
              )}
              {can('service.diagnostic.prepare') && detail.data.status === 'FINALIZED' && (
                <>
                  <Button variant="outline" onClick={() => void addItem('labor')}>Ajouter une prestation</Button>
                  <Button variant="outline" onClick={() => void addItem('part')}>Ajouter une pièce</Button>
                  <Button onClick={() => void issue('TAXABLE')}>Émettre avec TVA</Button>
                  <Button onClick={() => void issue('TAX_EXEMPT')}>Émettre sans TVA</Button>
                </>
              )}
              {detail.data.status === 'QUOTED' && can('service.diagnostic.accept') && (
                <>
                  <Button variant="success" onClick={() => void accept()}>Enregistrer l’acceptation du devis</Button>
                  <Button variant="danger" onClick={() => void refuse()}>Enregistrer le refus</Button>
                </>
              )}
              {detail.data.repair_order_id && (
                <Button onClick={() => navigate(`/service/repair-orders/${detail.data!.repair_order_id}`)}>Ouvrir l’OR</Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
