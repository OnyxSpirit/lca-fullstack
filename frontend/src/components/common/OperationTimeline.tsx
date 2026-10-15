import { formatDateTime } from "../../lib/utils";

export type TimelineEntry = {
  id: string;
  action?: string;
  event_type?: string;
  old_status?: string | null;
  new_status?: string | null;
  reason?: string | null;
  actor_name?: string | null;
  created_at: string;
  amount?: number | null;
  amount_before?: number | null;
  amount_after?: number | null;
};

export function OperationTimeline({
  entries,
  loading,
  empty = "Aucun historique disponible.",
}: {
  entries?: TimelineEntry[];
  loading?: boolean;
  empty?: string;
}) {
  if (loading) return <p className="text-xs text-slate-500">Chargement de l’historique…</p>;
  if (!entries?.length) return <p className="text-xs text-slate-500">{empty}</p>;
  return <ol className="space-y-3 border-l border-slate-200 pl-4">{entries.map(entry => {
    const action = entry.action ?? entry.event_type ?? "Opération";
    return <li key={entry.id} className="relative text-xs before:absolute before:-left-[21px] before:top-1 before:h-2 before:w-2 before:rounded-full before:bg-[#8f1722]">
      <div className="flex flex-wrap justify-between gap-2"><b>{action.replaceAll("_", " ")}</b><time className="text-slate-500">{formatDateTime(entry.created_at)}</time></div>
      {(entry.old_status || entry.new_status) && <p className="text-slate-600">{entry.old_status ?? "—"} → {entry.new_status ?? "—"}</p>}
      {entry.amount != null && <p>Montant : {Number(entry.amount).toLocaleString("fr-FR")}</p>}
      {entry.amount_before != null && entry.amount_after != null && <p>Réservé : {Number(entry.amount_before).toLocaleString("fr-FR")} → {Number(entry.amount_after).toLocaleString("fr-FR")}</p>}
      {entry.reason && <p className="text-slate-600">Motif : {entry.reason}</p>}
      <p className="text-slate-500">{entry.actor_name || "Acteur système"}</p>
    </li>;
  })}</ol>;
}
