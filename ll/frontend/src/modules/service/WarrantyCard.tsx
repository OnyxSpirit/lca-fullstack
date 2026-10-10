import { useEffect, useState } from 'react';
import { usePaymentMethodsQuery, useRepairOrderActions, useWarrantyClaimPayment } from '../../api/erpHooks';
import { Button } from '../../components/ui/Button';
import { Card, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatCurrency } from '../../lib/utils';
import { useAuthStore } from '../../stores/authStore';
import { useUiStore } from '../../stores/uiStore';
import type { RepairOrder } from '../../types';
import { warrantyAllocationLabel, warrantyDecisionLabel, warrantyModeLabel } from './warrantyLabels';

const field = 'w-full rounded-md border border-slate-300 p-2 text-sm';

function ClaimPayment({ claim }: { claim: NonNullable<NonNullable<RepairOrder['warranty']>['claim']> }) {
  const can = useAuthStore((state) => state.can);
  const toast = useUiStore((state) => state.addToast);
  const payment = useWarrantyClaimPayment();
  const methods = usePaymentMethodsQuery(can('billing.payment.collect'));
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const submit = async () => {
    try {
      await payment.mutateAsync({ claimId: claim.id, paymentMethodId, amount: Number(amount), reference, requestKey: crypto.randomUUID() });
      toast({ type: 'success', title: 'Règlement constructeur enregistré' });
    } catch (error) {
      toast({ type: 'error', title: 'Règlement refusé', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };
  return <>
    <p className="text-sm">Créance {claim.claimNumber} · {formatCurrency(claim.total)} · reçu {formatCurrency(claim.amountReceived)} · solde {formatCurrency(claim.balanceDue)}</p>
    {can('billing.payment.collect') && claim.balanceDue > 0 && <div className="grid gap-2 md:grid-cols-4">
      <input className={field} type="number" min="0.01" max={claim.balanceDue} value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Montant reçu" />
      <select aria-label="Moyen du règlement constructeur" className={field} value={paymentMethodId} onChange={(event)=>setPaymentMethodId(event.target.value)}><option value="">Moyen de paiement</option>{methods.data?.map((method:any)=><option key={method.id} value={method.id}>{method.name}</option>)}</select>
      <input className={field} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Référence du règlement" />
      <Button disabled={!paymentMethodId||!Number(amount) || Number(amount) > claim.balanceDue} loading={payment.isPending} onClick={submit}>Enregistrer le règlement</Button>
    </div>}
  </>;
}

export function WarrantyCard({ ro }: { ro: RepairOrder }) {
  const can = useAuthStore((state) => state.can);
  const toast = useUiStore((state) => state.addToast);
  const actions = useRepairOrderActions();
  const warranty = ro.warranty;
  const [mode, setMode] = useState<'FULL' | 'PARTIAL'>(warranty?.coverageMode ?? 'FULL');
  const [authorization, setAuthorization] = useState(warranty?.authorizationReference ?? '');
  const [comment, setComment] = useState(warranty?.decisionComment ?? '');
  const [shares, setShares] = useState<Record<string, string>>(Object.fromEntries((warranty?.allocations ?? []).map((allocation) => [allocation.repairOrderItemId, String(allocation.manufacturerShareHT)])));

  useEffect(() => {
    setMode(warranty?.coverageMode ?? 'FULL');
    setAuthorization(warranty?.authorizationReference ?? '');
    setComment(warranty?.decisionComment ?? '');
    setShares(Object.fromEntries((warranty?.allocations ?? []).map((allocation) => [allocation.repairOrderItemId, String(allocation.manufacturerShareHT)])));
  }, [ro.id, warranty?.version]);

  if (!warranty) return <Card><CardHeader><CardTitle>Prise en charge de cet OR</CardTitle></CardHeader><p className="text-sm">Aucune demande de prise en charge constructeur pour cet OR.</p></Card>;

  const mayDecide = can('service.warranty.approve');
  const deciding = actions.warrantyDecision.isPending;
  const lines = [...ro.parts.map((part) => ({ id: part.id, description: part.description, total: part.totalHT })), ...(ro.laborItems ?? []).map((labor) => ({ id: labor.id, description: labor.description, total: labor.lineTotal }))];
  const allocationsKnown = warranty.allocations.length > 0;
  const locked = ['CONTROLE_QUALITE', 'PRET', 'FACTURE', 'LIVRE', 'CLOTURE'].includes(ro.status);
  const approvalReason = !warranty.providerId ? 'Le constructeur du dossier est manquant. La demande doit être régularisée avant son approbation.' : !authorization.trim() ? 'Complétez le N° d’autorisation de prise en charge pour approuver la demande.' : '';
  const rejectionReason = !comment.trim() ? 'Indiquez le motif du refus constructeur.' : '';
  const shown = (value: number) => allocationsKnown ? formatCurrency(value) : 'À déterminer';

  const decide = async (decision: 'APPROVED' | 'REJECTED') => {
    if (decision === 'REJECTED' && !window.confirm('Confirmer le refus de la prise en charge constructeur pour cet OR ?')) return;
    try {
      await actions.warrantyDecision.mutateAsync({ repairOrderId: ro.id, expectedVersion: warranty.version, decision, ...(decision === 'APPROVED' ? { providerId: warranty.providerId, mode, authorizationReference: authorization.trim(), reason: comment.trim() } : { reason: comment.trim() }) });
      toast({ type: 'success', title: decision === 'APPROVED' ? 'Prise en charge approuvée' : 'Prise en charge refusée' });
    } catch (error) {
      toast({ type: 'error', title: 'Décision non enregistrée', description: error instanceof Error ? error.message : 'Erreur API' });
    }
  };
  const run = async (mutation: typeof actions.warrantyAllocations | typeof actions.warrantyConfirm, variables: object, title: string) => {
    try { await mutation.mutateAsync(variables); toast({ type: 'success', title }); }
    catch (error) { toast({ type: 'error', title, description: error instanceof Error ? error.message : 'Erreur API' }); }
  };

  return <Card>
    <CardHeader><div><CardTitle>Prise en charge de cet OR</CardTitle><CardDescription>Décision de principe du constructeur, distincte du contrat du véhicule et de la répartition financière définitive.</CardDescription></div></CardHeader>
    <div className="space-y-4">
      <div className="grid gap-2 text-sm sm:grid-cols-4">
        <span>Décision <b>{warrantyDecisionLabel[warranty.decisionStatus]}</b></span>
        <span>Type <b>{warranty.coverageMode ? warrantyModeLabel[warranty.coverageMode] : 'À définir'}</b></span>
        <span>Répartition financière <b>{warrantyAllocationLabel[warranty.allocationStatus]}</b></span>
        <span>Constructeur <b>{warranty.providerName ?? 'Non renseigné'}</b></span>
      </div>

      {warranty.decisionStatus === 'PENDING' && (mayDecide ? <div className="grid gap-3 md:grid-cols-2">
        <label className="text-sm">Constructeur<input className={`${field} mt-1 bg-slate-50`} readOnly value={warranty.providerName ?? 'Non renseigné'} /></label>
        <label className="text-sm">Code constructeur<input className={`${field} mt-1 bg-slate-50`} readOnly value={warranty.providerCode ?? 'Non renseigné'} /></label>
        <label className="text-sm">Type de prise en charge<select className={`${field} mt-1`} value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="FULL">Prise en charge totale</option><option value="PARTIAL">Prise en charge partielle</option></select></label>
        <label className="text-sm">N° d’autorisation de prise en charge<input className={`${field} mt-1`} value={authorization} onChange={(event) => setAuthorization(event.target.value)} /></label>
        <label className="text-sm">Commentaire / notes<input className={`${field} mt-1`} value={comment} onChange={(event) => setComment(event.target.value)} /></label>
        <div className="flex flex-wrap gap-2 md:col-span-2">
          <Button variant="danger" disabled={Boolean(rejectionReason) || deciding} loading={deciding} onClick={() => void decide('REJECTED')}>Refuser la prise en charge</Button>
          <Button variant="success" disabled={Boolean(approvalReason) || deciding} loading={deciding} onClick={() => void decide('APPROVED')}>Approuver la prise en charge</Button>
        </div>
        {approvalReason && <p className="text-sm text-amber-700 md:col-span-2">{approvalReason}</p>}
        {rejectionReason && <p className="text-sm text-amber-700 md:col-span-2">Pour refuser : {rejectionReason}</p>}
      </div> : <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">La prise en charge constructeur doit être traitée par un utilisateur autorisé avant la réception.</p>)}

      {warranty.decisionStatus !== 'PENDING' && <div className="grid gap-2 rounded border border-slate-200 p-3 text-sm sm:grid-cols-2">
        <span>Décision <b>{warrantyDecisionLabel[warranty.decisionStatus]}</b></span><span>Constructeur <b>{warranty.providerName ?? 'Non renseigné'}</b></span>
        <span>Code constructeur <b>{warranty.providerCode ?? 'Non renseigné'}</b></span>
        {warranty.coverageMode && <span>Type <b>{warrantyModeLabel[warranty.coverageMode]}</b></span>}
        {warranty.authorizationReference && <span>N° d’autorisation de prise en charge <b>{warranty.authorizationReference}</b></span>}
        {warranty.decidedAt && <span>Date de décision <b>{warranty.decidedAt}</b></span>}
        {warranty.decidedByName && <span>Décision enregistrée par <b>{warranty.decidedByName}</b></span>}
        {warranty.decisionComment && <span className="sm:col-span-2">Motif / notes <b>{warranty.decisionComment}</b></span>}
      </div>}

      {warranty.decisionStatus === 'APPROVED' && lines.length > 0 && <>
        <div className="overflow-x-auto"><table className="w-full min-w-[680px] text-sm"><thead><tr><th>Ligne réelle</th><th>Valeur HT</th><th>Constructeur HT</th><th>Client HT</th></tr></thead><tbody>{lines.map((line) => { const share = mode === 'FULL' ? line.total : Number(shares[line.id] ?? 0); return <tr key={line.id}><td>{line.description}</td><td>{formatCurrency(line.total)}</td><td><input className={field} type="number" disabled={locked || mode === 'FULL' || !can('service.warranty.manage')} value={mode === 'FULL' ? line.total : shares[line.id] ?? ''} onChange={(event) => setShares({ ...shares, [line.id]: event.target.value })} /></td><td>{formatCurrency(Math.max(0, line.total - share))}</td></tr>; })}</tbody></table></div>
        {!locked && can('service.warranty.manage') && <Button loading={actions.warrantyAllocations.isPending} onClick={() => void run(actions.warrantyAllocations, { repairOrderId: ro.id, expectedVersion: warranty.version, allocations: lines.map((line) => ({ repairOrderItemId: line.id, manufacturerShareHT: mode === 'FULL' ? line.total : Number(shares[line.id] ?? 0) })) }, 'Répartition enregistrée')}>Enregistrer la répartition</Button>}
        {!locked && can('service.warranty.approve') && warranty.allocationStatus === 'DRAFT' && <Button variant="success" loading={actions.warrantyConfirm.isPending} onClick={() => void run(actions.warrantyConfirm, { repairOrderId: ro.id, expectedVersion: warranty.version }, 'Répartition confirmée')}>Confirmer la répartition finale</Button>}
      </>}

      <div className="grid gap-2 rounded bg-slate-50 p-3 text-sm sm:grid-cols-3"><span>Montant total des travaux <b>{shown(warranty.summary.realTotal)}</b></span><span>Prise en charge constructeur <b>{shown(warranty.summary.manufacturerTotal)}</b></span><span>Reste à charge du client <b>{shown(warranty.summary.customerTotal)}</b></span></div>
      {warranty.claim && <p className="text-sm">Créance {warranty.claim.claimNumber} · {formatCurrency(warranty.claim.total)} · reçu {formatCurrency(warranty.claim.amountReceived)} · solde {formatCurrency(warranty.claim.balanceDue)}</p>}
    </div>
  </Card>;
}

export { ClaimPayment };
