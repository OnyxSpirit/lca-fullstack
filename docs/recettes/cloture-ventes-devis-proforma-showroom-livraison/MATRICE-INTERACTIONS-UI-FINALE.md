# Matrice des interactions UI

| Écran | Interaction contrôlée | Résultat attendu |
|---|---|---|
| Pro forma | Filtrer, trier, émettre, annuler | Liste stable et historique conservé |
| Livraison | Rechercher, filtrer, trier | Tri serveur sur liste blanche |
| Livraison détail | Finaliser | PV sans signature client numérique |
| Devis | Charger référentiels | Alerte bloquante uniquement si indisponibilité totale |
| Documents | Voir remise/GED | Deux états distincts et explicites |

| Identifiant | Chemin | Contrôle | Permission | Endpoint | Persistance | Test | Résultat | Preuve |
|---|---|---|---|---|---|---|---|---|
| SALES-SORT | Ventes | Critère + sens | `sales.view` | `GET /sales` | Aucune | Compilation + contrat | VALIDÉ : montant puis inversion | `commercial-list-sorting.test.ts` + navigateur réel 2026-11-14 |
| QUOTE-SORT | Ventes → Devis | Critère + sens | `quotations.view` | `GET /quotations` | Aucune | Compilation + contrat | VALIDÉ : validité puis inversion | `commercial-list-sorting.test.ts` + navigateur réel 2026-11-14 |
| SHOWROOM-SORT | Showroom & Réception | Critère + sens | `showroom.view` | `GET /showroom` | Aucune | Compilation + contrat | VALIDÉ : durée d’attente puis inversion | `commercial-list-sorting.test.ts` + navigateur réel 2026-11-14 |
| AUTH-LOGIN-2FA | Connexion | Connexion + second facteur | Compte actif | `POST /auth/*` | Session | Navigateur | BLOQUÉ | Titulaire 2FA requis |
