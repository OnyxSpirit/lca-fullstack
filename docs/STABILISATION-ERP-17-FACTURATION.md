# ERP-17 — Diagnostic Facturation

Conclusion API/MySQL/code : faux positif ERP16. L'agence principale 1 n'a aucune facture ; la page filtre explicitement l'agence courante, y compris pour GLOBAL. GLOBAL autorise l'accès mais ne supprime pas ce filtre.

BillingPage appelle useInvoicesPageQuery avec agency.id ; le hook transmet billingAgencyId. GET /invoices applique billingScopeSql puis AND i.agency_id=?. OWN financier est refusé ; CONCESSION limite aux agences de la concession ; AGENCY à l'agence ; GLOBAL conserve le filtre demandé.
Types : vehicle/workshop/parts/manual ; filtres recherche, statut, dates ; pagination 7. API sans pagination conserve son contrat tableau. Les erreurs sont affichées par query.isError et excluent l'état vide.

Preuves du script scripts/stabilisation-erp-17-readonly.mjs, sortie /tmp/erp17-api.json :
- agence1 : HTTP200 total0 ;
- agence2 : total12, pages de 7 puis5, IDs14,13,10,9,8,7,6 puis5,4,3,2,1 ;
- agence3 : total11 ;
- agence2 type workshop : total4 ;
- agence2 recherche REC15 : total2, IDs14/13.
SELECT COUNT(*) GROUP BY agency_id : 12 en A2,11 en A3, aucune A1.

Aucune correction Facturation nécessaire. Confirmation navigateur des filtres/détails/refresh : BLOQUÉE par l'outil ; clôture probatoire navigateur encore ouverte.

