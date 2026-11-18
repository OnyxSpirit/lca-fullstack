import { useState } from "react";
import { useBonusesQuery } from "../../api/hrHooks";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { ServerPagination } from "../../components/common/ServerPagination";
const field = "rounded-md border border-slate-300 bg-white px-3 py-2 text-xs",
  labels: Record<string, string> = {
    DRAFT: "Brouillon",
    PENDING: "En attente",
    APPROVED: "Approuvée",
    REJECTED: "Refusée",
    CANCELLED: "Annulée",
  };
export function BonusesAdministration({
  agencies,
}: {
  agencies: { id: string; name: string }[];
}) {
  const [page, setPage] = useState(1),
    [status, setStatus] = useState(""),
    [agencyId, setAgencyId] = useState(""),
    [search, setSearch] = useState(""),
    [pageSize, setPageSize] = useState(10),
    data = useBonusesQuery(
      { page, pageSize, status, agencyId, search },
      true,
    ),
    items = data.data?.items ?? [];
  return (
    <div className="space-y-4">
      <Card>
        <div className="grid gap-2 md:grid-cols-3">
          <input
            className={field}
            placeholder="Employé ou matricule"
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
          />
          <select
            className={field}
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
          >
            <option value="">Tous les statuts</option>
            {Object.entries(labels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <select
            className={field}
            value={agencyId}
            onChange={(e) => {
              setPage(1);
              setAgencyId(e.target.value);
            }}
          >
            <option value="">Toutes les agences</option>
            {agencies.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      </Card>
      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-slate-50 text-slate-500">
              <tr>
                <th className="p-4">Employé</th>
                <th className="p-4">Type</th>
                <th className="p-4">Référence</th>
                <th className="p-4 text-right">Montant</th>
                <th className="p-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b">
                  <td className="p-4">
                    <strong>
                      {b.first_name} {b.last_name}
                    </strong>
                    <br />
                    <small>{b.employee_number}</small>
                  </td>
                  <td className="p-4">{b.type_label_snapshot}</td>
                  <td className="p-4">{b.reference_date.slice(0, 10)}</td>
                  <td className="p-4 text-right font-bold">
                    {b.amount.toLocaleString("fr-FR")} {b.currency_code}
                  </td>
                  <td className="p-4">
                    <Badge
                      variant={
                        b.status === "APPROVED"
                          ? "success"
                          : b.status === "PENDING"
                            ? "warning"
                            : "default"
                      }
                    >
                      {labels[b.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.isLoading && (
            <p className="p-5 text-center text-xs text-slate-500">
              Chargement…
            </p>
          )}
          {data.isSuccess && !items.length && (
            <p className="p-5 text-center text-xs text-slate-500">
              Aucune prime dans ce périmètre.
            </p>
          )}
        </div>
        <ServerPagination page={page} pageSize={pageSize} total={data.data?.total??0} loading={data.isFetching} label="prime(s)" onPageChange={setPage} onPageSizeChange={size=>{setPageSize(size);setPage(1)}}/>
      </Card>
      <p className="text-xs text-slate-500">
        Les pièces GED ne sont pas chargées dans cette liste et restent
        accessibles uniquement depuis la fiche employé.
      </p>
    </div>
  );
}
