import React, { useEffect, useState } from "react";
import {
  useBillingAction,
  useInvoicePayment,
  usePaymentDestinationsQuery,
  usePaymentMethodsQuery,
} from "../../api/erpHooks";
import { Button } from "../../components/ui/Button";
import { Modal } from "../../components/ui/Modal";
import { formatCurrency, formatDateTime } from "../../lib/utils";
import { generateUuid } from "../../lib/uuid";
import { apiDownload, apiRequest } from "../../services/apiClient";
import { businessArchiveStatusLabel } from "../../services/businessArchiveStatus";
import { useUiStore } from "../../stores/uiStore";
import type { InvoicePayment } from "../../types";
import { canCollectInvoicePayment } from "./invoicePaymentPolicy";
import { useAuthStore } from "../../stores/authStore";

type PaymentTarget = { id: string; status: string; remainingAmountTTC: number };

export const InvoicePaymentForm: React.FC<{
  invoice: PaymentTarget;
  canCollect: boolean;
}> = ({ invoice, canCollect }) => {
  const today = new Date().toISOString().slice(0, 10),
    agencyId = useAuthStore((s) => s.currentAgency?.id),
    [open, setOpen] = useState(false),
    [operationKey, setOperationKey] = useState(generateUuid()),
    [attachmentFile, setAttachmentFile] = useState<File | null>(null),
    [attachmentName, setAttachmentName] = useState(""),
    [uploading, setUploading] = useState(false),
    [form, setForm] = useState({
      amount: invoice.remainingAmountTTC,
      paymentMethodId: "",
      treasuryAccountId: "",
      paymentDate: today,
      reference: "",
      notes: "",
      attachmentDocumentId: "",
    });
  const methodsQuery = usePaymentMethodsQuery(canCollect),
    methods = methodsQuery.data ?? [],
    payment = useInvoicePayment(),
    toast = useUiStore((s) => s.addToast),
    selected = methods.find(
      (item: any) => String(item.id) === form.paymentMethodId,
    ),
    destinations = usePaymentDestinationsQuery(
      invoice.id,
      form.paymentMethodId,
      agencyId,
    ),
    accounts = destinations.data?.items ?? [],
    allowed = canCollectInvoicePayment(
      invoice.status,
      invoice.remainingAmountTTC,
      canCollect,
    );
  useEffect(() => {
    if (open) setOpen(false);
  }, [agencyId]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (payment.isPending || uploading || !form.treasuryAccountId) return;
    let paymentConfirmed = false,
      documentId = form.attachmentDocumentId;
    try {
      if (attachmentFile && !documentId) {
        setUploading(true);
        const body = new FormData();
        body.append("file", attachmentFile);
        const uploaded = await apiRequest<{ id: string; fileName: string }>(
          `/invoices/${invoice.id}/payment-attachments`,
          { method: "POST", body },
        );
        documentId = uploaded.id;
        setForm((current) => ({
          ...current,
          attachmentDocumentId: uploaded.id,
        }));
        setAttachmentName(uploaded.fileName);
      }
      const result = (await payment.mutateAsync({
        invoiceId: invoice.id,
        ...form,
        attachmentDocumentId: documentId,
        idempotencyKey: operationKey,
      })) as any;
      paymentConfirmed = true;
      if (documentId)
        await apiRequest(`/payments/${result.id}/attachment`, {
          method: "POST",
          body: JSON.stringify({ documentId }),
        });
      toast({ type: "success", title: "Paiement enregistré" });
      setOperationKey(generateUuid());
      setAttachmentFile(null);
      setAttachmentName("");
      setOpen(false);
    } catch (error) {
      toast({
        type: paymentConfirmed ? "warning" : "error",
        title: paymentConfirmed
          ? "Paiement enregistré — justificatif à finaliser"
          : "Encaissement impossible",
        description: error instanceof Error ? error.message : "Erreur API",
      });
    } finally {
      setUploading(false);
    }
  };
  if (!allowed) return null;
  return (
    <>
      <Button
        size="sm"
        onClick={() => {
          setForm({
            amount: invoice.remainingAmountTTC,
            paymentMethodId: "",
            treasuryAccountId: "",
            paymentDate: today,
            reference: "",
            notes: "",
            attachmentDocumentId: "",
          });
          setAttachmentFile(null);
          setAttachmentName("");
          setOpen(true);
        }}
        disabled={payment.isPending}
      >
        Encaisser
      </Button>
      <Modal
        isOpen={open}
        onClose={() => !payment.isPending && !uploading && setOpen(false)}
        title="Enregistrer un règlement"
      >
        <form onSubmit={submit} className="space-y-3">
          <label className="text-xs font-semibold">
            Montant
            <input
              required
              type="number"
              min="0.01"
              max={invoice.remainingAmountTTC}
              step="0.01"
              className="mt-1 w-full rounded border p-2"
              value={form.amount}
              onChange={(event) =>
                setForm({ ...form, amount: Number(event.target.value) })
              }
            />
          </label>
          <label className="text-xs font-semibold">
            Date du règlement
            <input
              required
              type="date"
              max={today}
              className="mt-1 w-full rounded border p-2"
              value={form.paymentDate}
              onChange={(event) =>
                setForm({ ...form, paymentDate: event.target.value })
              }
            />
          </label>
          <label className="text-xs font-semibold">
            Moyen de paiement
            <select
              required
              className="mt-1 w-full rounded border p-2"
              value={form.paymentMethodId}
              onChange={(event) => {
                setForm({
                  ...form,
                  paymentMethodId: event.target.value,
                  treasuryAccountId: "",
                  reference: "",
                  attachmentDocumentId: "",
                });
                setAttachmentFile(null);
                setAttachmentName("");
              }}
            >
              <option value="">Sélectionner</option>
              {methods.map((item: any) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {form.paymentMethodId && (
            <label className="text-xs font-semibold">
              Compte destinataire
              <select
                required
                disabled={destinations.isLoading || !accounts.length}
                className="mt-1 w-full rounded border p-2"
                value={form.treasuryAccountId}
                onChange={(event) =>
                  setForm({ ...form, treasuryAccountId: event.target.value })
                }
              >
                <option value="">Sélectionner explicitement</option>
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code}) — {item.currencyCode}
                  </option>
                ))}
              </select>
            </label>
          )}
          {destinations.isLoading && (
            <p className="text-xs text-slate-500">
              Chargement des comptes compatibles…
            </p>
          )}
          {form.paymentMethodId &&
            !destinations.isLoading &&
            !destinations.isError &&
            !accounts.length && (
              <p className="text-xs text-amber-700">
                Aucun compte de trésorerie actif et compatible n'est configuré
                pour ce moyen de paiement dans le périmètre autorisé.
              </p>
            )}
          {selected?.requires_reference && (
            <label className="text-xs font-semibold">
              Référence transaction
              <input
                required
                className="mt-1 w-full rounded border p-2"
                value={form.reference}
                onChange={(event) =>
                  setForm({ ...form, reference: event.target.value })
                }
              />
            </label>
          )}
          {form.paymentMethodId && (
            <label className="text-xs font-semibold">
              Justificatif externe{" "}
              {selected?.requires_attachment ? "(obligatoire)" : "(facultatif)"}
              <input
                required={Boolean(selected?.requires_attachment)}
                accept="application/pdf,image/png,image/jpeg"
                type="file"
                className="mt-1 w-full rounded border p-2"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setAttachmentFile(file);
                  setAttachmentName(file?.name ?? "");
                  setForm({ ...form, attachmentDocumentId: "" });
                }}
              />
              {attachmentName && (
                <span className="mt-1 flex items-center justify-between font-normal">
                  <span>
                    {uploading ? "Téléversement en cours…" : attachmentName}
                  </span>
                  {!selected?.requires_attachment && !uploading && (
                    <button
                      type="button"
                      className="text-red-700"
                      onClick={() => {
                        setAttachmentFile(null);
                        setAttachmentName("");
                        setForm({ ...form, attachmentDocumentId: "" });
                      }}
                    >
                      Retirer
                    </button>
                  )}
                </span>
              )}
            </label>
          )}
          <label className="text-xs font-semibold">
            Notes
            <textarea
              className="mt-1 w-full rounded border p-2"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
            />
          </label>
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={payment.isPending || uploading}
              disabled={
                payment.isPending ||
                uploading ||
                !form.paymentMethodId ||
                !form.treasuryAccountId ||
                destinations.isLoading ||
                Boolean(
                  selected?.requires_attachment &&
                  !attachmentFile &&
                  !form.attachmentDocumentId,
                )
              }
            >
              Valider
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
};

export const InvoicePaymentHistory: React.FC<{
  payments?: InvoicePayment[];
  canRefund?: boolean;
  canCancel?: boolean;
  canRecoverReceipt?: boolean;
  onRefund?: (payment: InvoicePayment) => void;
  onCancel?: (payment: InvoicePayment) => void;
}> = ({
  payments = [],
  canRefund = false,
  canCancel = false,
  canRecoverReceipt = false,
  onRefund,
  onCancel,
}) => {
  const toast = useUiStore((s) => s.addToast),
    archive = useBillingAction(),
    download = async (payment: InvoicePayment) => {
      try {
        const blob = await apiDownload(`/payments/${payment.id}/receipt`),
          url = URL.createObjectURL(blob),
          anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `recu-${payment.paymentNumber}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        toast({
          type: "error",
          title: "Reçu indisponible",
          description: error instanceof Error ? error.message : "Erreur API",
        });
      }
    },
    supporting = async (payment: InvoicePayment) => {
      try {
        const blob = await apiDownload(`/payments/${payment.id}/attachment`),
          url = URL.createObjectURL(blob);
        window.open(url, "_blank", "noopener,noreferrer");
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      } catch (error) {
        toast({
          type: "error",
          title: "Justificatif indisponible",
          description: error instanceof Error ? error.message : "Erreur API",
        });
      }
    },
    recover = async (payment: InvoicePayment) => {
      try {
        await archive.mutateAsync({
          path: `/payments/${payment.id}/receipt/archive`,
        });
        toast({ type: "success", title: "Archivage du reçu finalisé" });
      } catch (error) {
        toast({
          type: "error",
          title: "Archivage toujours indisponible",
          description: error instanceof Error ? error.message : "Erreur API",
        });
      }
    };
  return payments.length ? (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-xs">
        <thead>
          <tr className="text-left">
            <th>Règlement</th>
            <th>Date</th>
            <th>Méthode</th>
            <th>Destination</th>
            <th>Référence</th>
            <th>Opérateur</th>
            <th>Montant</th>
            <th>Remboursé</th>
            <th>Statut</th>
            <th>Justificatif externe</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {payments.map((item) => {
            const recoverable =
              item.receiptArchiveStatus === "MISSING_RECORD" ||
              item.receiptArchiveStatus === "HISTORICAL_ONLY";
            return (
              <tr key={item.id} className="border-t">
                <td className="py-2 font-mono">{item.paymentNumber}</td>
                <td>{formatDateTime(item.paymentDate)}</td>
                <td>{item.paymentMethod}</td>
                <td>
                  {item.treasuryAccountName
                    ? `${item.treasuryAccountName} (${item.treasuryAccountCode})`
                    : "Historique non qualifié"}
                </td>
                <td>{item.reference || "—"}</td>
                <td>{item.receivedByName || "—"}</td>
                <td>{formatCurrency(item.amount)}</td>
                <td>{formatCurrency(item.refundedAmount)}</td>
                <td>{item.status}</td>
                <td>
                  {item.attachmentDocumentId ? (
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => void supporting(item)}
                    >
                      Consulter
                    </Button>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <div className="flex gap-1">
                    <span
                      className={
                        item.receiptArchiveAvailable
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }
                    >
                      {businessArchiveStatusLabel(item.receiptArchiveStatus)}
                    </span>
                    <Button
                      size="xs"
                      variant="outline"
                      disabled={!item.receiptArchiveAvailable}
                      onClick={() => void download(item)}
                    >
                      Reçu
                    </Button>
                    {canRecoverReceipt && recoverable && (
                      <Button
                        size="xs"
                        variant="outline"
                        loading={
                          archive.isPending &&
                          archive.variables?.path ===
                            `/payments/${item.id}/receipt/archive`
                        }
                        disabled={archive.isPending}
                        onClick={() => void recover(item)}
                      >
                        Finaliser l’archivage
                      </Button>
                    )}
                    {canRefund &&
                      item.status === "confirmed" &&
                      item.refundableRemaining > 0 &&
                      onRefund && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => onRefund(item)}
                        >
                          Rembourser
                        </Button>
                      )}
                    {canCancel &&
                      item.status === "confirmed" &&
                      item.refundedAmount === 0 &&
                      onCancel && (
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => onCancel(item)}
                        >
                          Annuler
                        </Button>
                      )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  ) : (
    <p className="text-sm text-slate-500">Aucun règlement.</p>
  );
};
