# Pagination serveur

Endpoints finalisés :

- `GET /invoices/:id/payments?page&pageSize`
- `GET /invoices/:id/refunds?page&pageSize`
- `GET /invoices/:id/credit-notes?page&pageSize`
- `GET /vehicle-interagency-transfers?page&pageSize&vehicleId`
- groupes de rapprochement bancaire, écarts et mouvements non rapprochés.

Les routes appliquent COUNT et SELECT sur le même périmètre, puis LIMIT/OFFSET. Le contrat expose items, total, page, pageSize et totalPages. Les agrégats financiers de facture restent indépendants des pages affichées.

