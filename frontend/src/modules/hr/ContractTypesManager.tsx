import { useState, type FormEvent } from 'react';
import { type Employee, type EmployeeContractType, useEmployeeContractTypesQuery, useHrActions } from '../../api/hrHooks';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';

const field = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs';
type Form = { code: string; name: string; description: string };
const empty: Form = { code: '', name: '', description: '' };

export function ContractTypesManager({ employee }: { employee: Employee }) {
  const can = useAuthStore(s => s.can), toast = useUiStore(s => s.addToast), actions = useHrActions();
  const types = useEmployeeContractTypesQuery(employee.concession_id, can('hr.contract.type.manage'));
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<EmployeeContractType | null>(null), [form, setForm] = useState<Form>(empty), [error, setError] = useState('');
  if (!can('hr.contract.type.manage')) return null;
  const pending = actions.contractType.isPending;
  const run = async (promise: Promise<unknown>, title: string) => { try { await promise; await types.refetch(); toast({ type: 'success', title }); setError(''); return true; } catch (value) { const description = value instanceof Error ? value.message : 'Erreur API'; setError(description); toast({ type: 'error', title: 'Action impossible', description }); return false; } };
  const beginCreate = () => { setEditing(null); setForm(empty); setError(''); };
  const beginEdit = (value: EmployeeContractType) => { setEditing(value); setForm({ code: value.code, name: value.name, description: value.description ?? '' }); setError(''); };
  const submit = async (event: FormEvent) => { event.preventDefault(); if (pending || !form.code.trim() || !form.name.trim()) return; const ok = await run(actions.contractType.mutateAsync(editing ? { id: editing.id, ...form, isActive: editing.is_active } : { ...form, concessionId: employee.concession_id }), editing ? 'Type de contrat modifié' : 'Type de contrat créé'); if (ok) beginCreate(); };
  const close = () => { if (!pending) { setOpen(false); beginCreate(); } };

  return <><div className="flex justify-end"><Button size="xs" variant="outline" onClick={() => { beginCreate(); setOpen(true); }}>Types de contrats</Button></div><Modal isOpen={open} onClose={close} title="Types de contrats" description="Référentiel collectif de la concession. Les contrats historiques conservent leur libellé d’origine." maxWidth="xl"><div className="space-y-4">
    <div className="divide-y rounded border">{types.data?.map(value => <div key={value.id} className="flex flex-wrap items-center justify-between gap-3 p-3 text-xs"><span><strong>{value.code} · {value.name}</strong><br/><small className="text-slate-500">{value.description || 'Sans description'}{value.is_used ? ' · déjà utilisé, code immuable' : ''}</small></span><div className="flex items-center gap-2"><Badge variant={value.is_active ? 'success' : 'default'}>{value.is_active ? 'Actif' : 'Inactif'}</Badge><Button size="xs" variant="outline" disabled={pending} onClick={() => beginEdit(value)}>Modifier</Button><Button size="xs" variant="outline" disabled={pending} loading={pending && editing?.id === value.id} onClick={() => void run(actions.contractType.mutateAsync({ id: value.id, code: value.code, name: value.name, description: value.description ?? '', isActive: !value.is_active }), value.is_active ? 'Type désactivé' : 'Type réactivé')}>{value.is_active ? 'Désactiver' : 'Réactiver'}</Button></div></div>)}{types.isSuccess && !types.data?.length && <p className="p-4 text-center text-xs text-slate-500">Aucun type configuré. Aucun type juridique n’est imposé par défaut.</p>}</div>
    <form className="space-y-3 rounded-md bg-slate-50 p-4" onSubmit={submit}><h4 className="text-sm font-bold">{editing ? `Modifier ${editing.name}` : 'Nouveau type de contrat'}</h4><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">Code *<input data-autofocus aria-label="Code type contrat" required maxLength={50} className={`${field} mt-1`} value={form.code} disabled={Boolean(editing?.is_used)} onChange={event => setForm({ ...form, code: event.target.value })}/></label><label className="text-xs font-semibold">Libellé *<input aria-label="Nom type contrat" required maxLength={120} className={`${field} mt-1`} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })}/></label></div><label className="block text-xs font-semibold">Description<textarea aria-label="Description type contrat" maxLength={500} rows={3} className={`${field} mt-1`} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })}/></label>{editing?.is_used && <p className="text-xs text-amber-700">Ce type est déjà utilisé : son code et son historique sont protégés. Le libellé modifié ne changera pas les snapshots des contrats existants.</p>}{error && <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-700">{error}</p>}<div className="flex justify-end gap-2">{editing && <Button type="button" variant="outline" disabled={pending} onClick={beginCreate}>Annuler la modification</Button>}<Button type="submit" loading={pending} disabled={!form.code.trim() || !form.name.trim()}>{editing ? 'Enregistrer' : 'Créer le type'}</Button></div></form>
  </div></Modal></>;
}
