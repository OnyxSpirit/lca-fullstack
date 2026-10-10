# RECETTE-ERP-02 — Tests et preuves

## Matrice synthétique

| Contrôle | Résultat | Preuve |
|---|---:|---|
| Bootstrap MySQL 8.4 vide | Réussi | migrations jusqu'à 079 |
| Connexion navigateur | Réussi | redirection `/login` → `/dashboard` |
| Création prospect | Réussi | toast et compteur 1 |
| Recherche temporisée | Réussi | `Alice` retourne le prospect |
| Kanban / Liste | Réussi | mêmes données et étape Contacté |
| Activité / historique | Réussi | appel, auteur, responsable, date |
| Transition autorisée | Réussi | Nouveau → Contacté |
| Précondition qualification | Réussi | refus explicite sans commercial |
| Backend CRM ciblé | 6/6 | 0 échec |
| Concurrence essais MySQL | 1/1 | 0 échec, 953 ms |
| Lint backend/frontend | Réussi | TypeScript sans erreur |
| Build backend/frontend | Réussi | Vite 2 487 modules |
| Backend global | 177/217 | 40 échecs, 0 skip |
| Frontend global | 751/785 | 34 échecs, 0 skip |

## Tests ciblés backend

`valid-erp-02-crm-contracts`, `crm-stage-transition-matrix`, `crm-functional-reliability`, `crm-appointment-reliability`, `crm-dynamic-rbac`, `dashboard-crm-scope` : six fichiers réussis.

## Concurrence MySQL 8.4

Le test transactionnel exerce deux réservations simultanées et vérifie :

- même véhicule : une création, un conflit ;
- même commercial : une création, un conflit ;
- créneaux adjacents : deux créations successives ;
- véhicule et commercial différents : deux créations concurrentes ;
- rollback et nettoyage des lignes entre scénarios.

## Limites

Les tests frontend filtrés via `--test-name-pattern` ne constituent pas un découpage CRM fiable, car le runner applique le motif à des intitulés transversaux. Les résultats de référence sont donc les tests CRM identifiés et la suite globale exacte ci-dessus.
