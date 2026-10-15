import { Router } from "express";
import { asyncHandler } from "../../middleware/error-handler.js";
import { requirePermission } from "../../middleware/require-permission.js";
import * as s from "./treasury.service.js";
import * as flow from "./treasury-flow.service.js";
import * as coverage from "./treasury-coverage.service.js";
import { financialCsv, type CsvValue } from "../reports/report.csv.js";
export const treasuryRouter = Router();
treasuryRouter.get(
  "/treasury/accounts",
  requirePermission("treasury.view"),
  asyncHandler(async (r, res) => res.json(await s.listAccounts(r))),
);
treasuryRouter.get(
  "/treasury/account-territories",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) => res.json(await s.accountTerritories(r))),
);
treasuryRouter.get(
  "/treasury/accounts/:id",
  requirePermission("treasury.view"),
  asyncHandler(async (r, res) => res.json(await s.getAccount(r, r.params.id))),
);
treasuryRouter.post(
  "/treasury/accounts",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) =>
    res.status(201).json(await s.createAccount(r, r.body)),
  ),
);
treasuryRouter.patch(
  "/treasury/accounts/:id",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) =>
    res.json(await s.updateAccount(r, r.params.id, r.body)),
  ),
);
treasuryRouter.patch(
  "/treasury/accounts/:id/status",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) =>
    res.json(await s.accountStatus(r, r.params.id, r.body.isActive)),
  ),
);
treasuryRouter.get(
  "/treasury/categories",
  requirePermission("treasury.view"),
  asyncHandler(async (r, res) => res.json(await s.listCategories(r))),
);
treasuryRouter.post(
  "/treasury/categories",
  requirePermission("treasury.category.manage"),
  asyncHandler(async (r, res) =>
    res.status(201).json(await s.createCategory(r, r.body)),
  ),
);
treasuryRouter.patch(
  "/treasury/categories/:id",
  requirePermission("treasury.category.manage"),
  asyncHandler(async (r, res) =>
    res.json(await s.updateCategory(r, r.params.id, r.body)),
  ),
);
treasuryRouter.patch(
  "/treasury/categories/:id/status",
  requirePermission("treasury.category.manage"),
  asyncHandler(async (r, res) =>
    res.json(await s.categoryStatus(r, r.params.id, r.body.isActive)),
  ),
);
treasuryRouter.get(
  "/treasury/journal",
  requirePermission("treasury.view"),
  asyncHandler(async (r, res) => res.json(await s.journal(r, r.query))),
);
treasuryRouter.get(
  "/treasury/journal/export",
  requirePermission("treasury.view"),
  asyncHandler(async (r, res) => {
    const rows: any[] = await s.journalExport(r, r.query),
      labels: Record<string, string> = {
        PAYMENT: "Paiement client",
        PAYMENT_REFUND: "Remboursement client",
        WARRANTY_CLAIM_PAYMENT: "Règlement garantie constructeur",
        MANUAL_RECEIPT: "Entrée manuelle",
        MANUAL_DISBURSEMENT: "Sortie manuelle",
        BUDGET_EXPENSE_DISBURSEMENT: "Décaissement budgétaire",
        TRANSFER: "Transfert",
        TRANSFER_REVERSAL: "Contrepassation de transfert",
        REVERSAL: "Contrepassation",
        OPENING_BALANCE: "Solde d’ouverture",
      },
      status: Record<string, string> = {
        POSTED: "Comptabilisé",
        CANCELLED: "Annulé",
        PENDING: "En attente",
      },
      businessReference = (x: any) => x.reference?.trim() || `${labels[x.source_type] ?? "Mouvement"} ${x.source_id}`,
      csv: CsvValue[][] = [
        [
          "Date",
          "Type d’opération",
          "Compte",
          "Référence",
          "Description",
          "Entrée",
          "Sortie",
          "Devise",
          "Statut",
          "Catégorie",
          "Moyen de paiement",
          "Agence",
          "Concession",
          "Auteur",
        ],
        ...rows.map((x) => [
          String(x.value_date).slice(0, 10).split("-").reverse().join("/"),
          labels[x.source_type] ?? "Mouvement de trésorerie",
          x.account_name,
          businessReference(x),
          x.description ?? "",
          x.direction === "IN" ? Number(x.amount) : "",
          x.direction === "OUT" ? Number(x.amount) : "",
          x.currency_code,
          x.is_reversed ? "Contrepassé" : (status[x.status] ?? "Statut non traduit"),
          x.category_name ?? "",
          x.payment_method_name ?? "",
          x.agency_name ?? "Administration globale",
          x.concession_name,
          x.author_name ?? "",
        ]),
      ];
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="journal-tresorerie-${new Date().toISOString().slice(0, 10)}.csv"`,
    );
    res.end(financialCsv(csv));
  }),
);
treasuryRouter.get(
  "/treasury/journal/:id",
  requirePermission("treasury.view"),
  asyncHandler(async (r, res) => res.json(await s.movement(r, r.params.id))),
);
treasuryRouter.get(
  "/treasury/summary",
  requirePermission("treasury.view"),
  asyncHandler(async (r, res) => res.json(await s.summary(r, r.query))),
);
treasuryRouter.get(
  "/treasury/coverage",
  requirePermission("treasury.coverage.view"),
  asyncHandler(async (r, res) => res.json(await coverage.coverage(r))),
);
treasuryRouter.get(
  "/treasury/budget-indicators",
  requirePermission("treasury.coverage.view"),
  asyncHandler(async (r, res) => res.json(await coverage.budgetIndicators(r))),
);
treasuryRouter.get(
  "/treasury/reservations",
  requirePermission("treasury.reservation.view"),
  asyncHandler(async (r, res) => res.json(await coverage.listReservations(r))),
);
treasuryRouter.get("/treasury/reservation-expenses",requirePermission("treasury.reservation.create"),asyncHandler(async(r,res)=>res.json(await coverage.eligibleExpenses(r,r.query.accountId))));
treasuryRouter.post(
  "/treasury/reservations",
  requirePermission("treasury.reservation.create"),
  asyncHandler(async (r, res) =>
    res.status(201).json(await coverage.createReservation(r, r.body)),
  ),
);
treasuryRouter.post("/treasury/reservations/:id/submit",requirePermission("treasury.reservation.submit"),asyncHandler(async(r,res)=>res.json(await coverage.submitReservation(r,r.params.id))));
treasuryRouter.post("/treasury/reservations/:id/approve",requirePermission("treasury.reservation.approve"),asyncHandler(async(r,res)=>res.json(await coverage.approveReservation(r,r.params.id))));
treasuryRouter.post("/treasury/reservations/:id/reject",requirePermission("treasury.reservation.approve"),asyncHandler(async(r,res)=>res.json(await coverage.rejectReservation(r,r.params.id,r.body))));
treasuryRouter.post("/treasury/reservations/:id/cancel",requirePermission("treasury.reservation.cancel"),asyncHandler(async(r,res)=>res.json(await coverage.cancelReservation(r,r.params.id,r.body))));
treasuryRouter.post("/treasury/reservations/:id/expire",requirePermission("treasury.reservation.expire"),asyncHandler(async(r,res)=>res.json(await coverage.expireReservation(r,r.params.id,r.body))));
treasuryRouter.patch(
  "/treasury/reservations/:id",
  requirePermission("treasury.reservation.adjust"),
  asyncHandler(async (r, res) =>
    res.json(await coverage.adjustReservation(r, r.params.id, r.body)),
  ),
);
treasuryRouter.post(
  "/treasury/reservations/:id/release",
  requirePermission("treasury.reservation.release"),
  asyncHandler(async (r, res) =>
    res.json(await coverage.releaseReservation(r, r.params.id, r.body)),
  ),
);
treasuryRouter.get(
  "/treasury/reservations/:id/history",
  requirePermission("treasury.reservation.view"),
  asyncHandler(async (r, res) =>
    res.json(await coverage.reservationHistory(r, r.params.id)),
  ),
);
treasuryRouter.get(
  "/treasury/manual-options",
  requirePermission("treasury.view"),
  asyncHandler(async (_r, res) => res.json(await s.manualOptions())),
);
treasuryRouter.post(
  "/treasury/transfers",
  requirePermission("treasury.transfer.create"),
  asyncHandler(async (r, res) =>
    res.status(201).json(await s.transfer(r, r.body)),
  ),
);
treasuryRouter.post(
  "/treasury/manual-receipts",
  requirePermission("treasury.receipt.create"),
  asyncHandler(async (r, res) =>
    res.status(201).json(await s.createManualReceipt(r, r.body)),
  ),
);
treasuryRouter.post(
  "/treasury/manual-disbursements",
  requirePermission("treasury.disbursement.create"),
  asyncHandler(async (r, res) =>
    res.status(201).json(await s.createManualDisbursement(r, r.body)),
  ),
);
treasuryRouter.get(
  "/hr/budget-expenses/:id/disbursements",
  requirePermission("hr.expense.view"),
  asyncHandler(async (r, res) =>
    res.json(await s.budgetExpenseDisbursements(r, r.params.id)),
  ),
);
treasuryRouter.post(
  "/hr/budget-expenses/:id/disbursements",
  requirePermission("hr.expense.disburse"),
  asyncHandler(async (r, res) => {
    await s.assertBudgetExpenseApproved(r.params.id);
    res.status(201).json(await s.budgetExpenseDisburse(r, r.params.id, r.body));
  }),
);
treasuryRouter.post(
  "/treasury/movements/:id/reversal",
  requirePermission("treasury.reverse"),
  asyncHandler(async (r, res) =>
    res.status(201).json(await s.reverse(r, r.params.id, r.body)),
  ),
);
treasuryRouter.get(
  "/treasury/flow-configuration",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) => res.json(await flow.getFlowConfiguration(r))),
);
treasuryRouter.put(
  "/treasury/flow-mappings",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) => res.json(await flow.saveMapping(r, r.body))),
);
treasuryRouter.patch(
  "/treasury/flow-mappings/:id",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) =>
    res.json(await flow.updateMapping(r, r.params.id, r.body)),
  ),
);
treasuryRouter.patch(
  "/treasury/flow-mappings/:id/status",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) =>
    res.json(await flow.setMappingStatus(r, r.params.id, r.body.isActive)),
  ),
);
treasuryRouter.delete(
  "/treasury/flow-mappings/:id",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) =>
    res.json(await flow.deleteMapping(r, r.params.id)),
  ),
);
treasuryRouter.patch(
  "/treasury/flow-readiness",
  requirePermission("treasury.account.manage"),
  asyncHandler(async (r, res) =>
    res.json(await flow.setReadiness(r, r.body.isReady, r.body.concessionId)),
  ),
);
