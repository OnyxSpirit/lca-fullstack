import { useState } from 'react';
import { useBankReconciliationActions, useBankReconciliationGroups } from '../../api/treasuryHooks';
import { ServerPagination } from '../../components/common/ServerPagination';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency, formatDate } from '../../lib/utils';
import { accountingCodeLabel } from '../../lib/userFacingLabels';
import { apiRequest } from '../../services/apiClient';
import { useAuthStore } from '../../stores/authStore';

export function BankReconciliationGroupsPanel() {
  const can = useAuthStore(state => state.can), [page, setPage] = useState(1), [pageSize, setPageSize] = useState(10), groups = useBankReconciliationGroups(page, pageSize), actions = useBankReconciliationActions(), [selected, setSelected] = useState(''), [detail, setDetail] = useState<any>(null), [cancel, setCancel] = useState<any>(null), [reason, setReason] = useState('');
  const open = async (id: string) => { setSelected(id); setDetail(await apiRequest(`/treasury/bank-reconciliation/groups/${id}`)); };
  return <Card>
    <h3 className="font-bold">Historique des rapprochements groupés</h3>
    {groups.data?.items.map((item: any) => <div key={item.id} className="mt-2 flex flex-wrap items-center justify-between border-t py-2 text-xs"><button className="text-left" onClick={() => void open(String(item.id))}><b>Groupe {item.id}</b> · {accountingCodeLabel(item.match_level)} · {formatCurrency(Number(item.total_bank_amount), item.currency_code)}<br />{item.allocationCount} allocation(s) · {accountingCodeLabel(item.status)} · {formatDate(item.prepared_at)}</button>{item.status === 'VALIDATED' && can('treasury.reconciliation.cancel') && <Button size="xs" variant="outline" onClick={() => setCancel(item)}>Annuler</Button>}</div>)}
    {!groups.data?.items.length && <p className="mt-2 text-xs text-slate-500">Aucun rapprochement groupé.</p>}
    <ServerPagination page={page} pageSize={pageSize} total={groups.data?.total ?? 0} totalPages={groups.data?.totalPages} loading={groups.isFetching} label="groupe(s)" onPageChange={setPage} onPageSizeChange={size => { setPageSize(size); setPage(1); }} />
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected('')} title={`Allocations du groupe ${selected}`}>{detail?.allocations?.map((item: any) => <p key={item.id} className="border-t py-2 text-xs">Ligne {item.statement_line_id} → mouvement {item.treasury_movement_id} · <b>{formatCurrency(Number(item.allocated_amount), item.currencyCode)}</b> · {accountingCodeLabel(item.status)}<br />{item.bankDescription} / {item.treasuryReference ?? item.treasuryDescription}</p>)}</Modal>
    <Modal isOpen={Boolean(cancel)} onClose={() => setCancel(null)} title="Annuler le rapprochement groupé"><form className="grid gap-3" onSubmit={async event => { event.preventDefault(); await actions.cancelGroup.mutateAsync({ id: String(cancel.id), reason }); setCancel(null); setReason(''); }}><textarea className="rounded border p-2" required minLength={5} value={reason} onChange={event => setReason(event.target.value)} placeholder="Motif obligatoire" /><Button type="submit" loading={actions.cancelGroup.isPending}>Confirmer</Button></form></Modal>
  </Card>;
}
