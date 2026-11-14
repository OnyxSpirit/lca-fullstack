# Matrice frontend ↔ backend

| Frontend | Contrat API | Persistance | Cohérence |
|---|---|---|---|
| `useRepairOrders*` | `/repair-orders*` | OR et sous-entités | OK |
| création véhicule externe | `/workshop/external-vehicles` | véhicule + association transactionnelle | OK |
| `SavTransitSection` | `/sav/transit*` | transferts/audit | KO pour SA GLOBAL |
| `SavJournalSection` | `/sav/journal` | lecture historiques/paiements | KO pour SA GLOBAL |
| `SavReportingSection` | `/sav/reporting` | agrégats lecture | KO pour SA GLOBAL |
| hooks Parts | `/parts*` | catalogue/stocks/mouvements | OK |
| `PartsWorkQueuePage` | logistique interne | demandes/réservations/livraisons | OK |

Cause commune des trois KO : contrat de scope incohérent entre `agency-rbac.service` (GLOBAL conservé) et `scope-intersection` (GLOBAL refusé en contexte migré).

