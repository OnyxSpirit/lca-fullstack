# Matrice frontend ↔ backend

| Frontend | Hook/API | Backend | Concordance |
|---|---|---|---|
| BillingPage | invoices page/config/export | billing.routes | Oui |
| NewInvoiceModal | create invoice | POST invoices | Oui |
| InvoiceDetailPage | invoice/actions | invoice lifecycle | Oui |
| InvoicePaymentComponents | methods/destinations/payments/cancel | payment routes | Oui |
| FinancialDashboardPage | dashboard/activities/export | financial reports | Oui |
| TreasuryPage | accounts/categories/manual/transfers | treasury routes/services | Oui |
| AccountingPage | chart/fiscal/journals/mappings | accounting.routes | Oui |
| AccountingEntriesPanel | entries/actions/export | accounting-entry routes | Oui |
| AccountingAdvancedPanels | ledger/balance/controls/statements | advanced routes | Oui |
| BankReconciliationPanel | statements/groups/discrepancies | reconciliation routes | Oui |

102 routes financières/comptables ont été inventoriées statiquement. La concordance ne vaut pas exécution navigateur.
