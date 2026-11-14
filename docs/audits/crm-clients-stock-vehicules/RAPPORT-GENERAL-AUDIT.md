# Rapport général d’audit — CRM, Client 360° et Stock véhicules

Date d’exécution : 14 novembre 2026. Périmètre : code courant, API Node, frontend React, MySQL 8.4 et environnement Docker `lca-recette`. Cet audit n’a modifié ni le code métier ni les données de `lca_recette`.

## Conclusion exécutive

| Domaine | Appréciation | Synthèse |
|---|---|---|
| CRM & prospection | CONFORME avec réserves | Pipeline, activités, rendez-vous, essais, affectation, showroom et conversion sont cohérents et protégés. L’archivage d’un prospect n’existe pas. |
| Fiche Client 360° | CONFORME avec réserves | Agrégation réelle, paginée et filtrée par permission. L’édition client n’est pas proposée depuis la fiche et l’historique des contacts supprimés n’est pas conservé. |
| Stock VN/VO | PARTIELLE | CRUD, VIN, états, emplacements, photos, données techniques et verrouillage vente sont solides. Filtre prix, tri sélectionnable et véritable transfert inter-agences sont absents. |
| RBAC / multi-agences | CONFORME avec réserve majeure | Les lectures et mutations sensibles sont revalidées dans le contexte d’agence courant. Le transfert inter-agences reste volontairement fermé faute d’autorisation de destination. |

## Preuves exécutées

- Backend ciblé : 523 tests, 505 réussis, 0 échec, 18 ignorés conditionnellement.
- Frontend ciblé : 43 tests, 43 réussis, 0 échec.
- MySQL 8.4 : test d’identité client et de concurrence exécuté dans un schéma unique temporaire, supprimé après exécution; succès.
- Docker : backend `127.0.0.1:3004` et MySQL `127.0.0.1:33321` sains; `/api/health` répond `ok`.
- Base recette : MySQL 8.4.11, 56 migrations enregistrées, 0 étape de migration non appliquée et 8/8 tables cœur contrôlées présentes.
- Revue statique : routes, hooks, composants, permissions, prédicats de portée, transactions et verrous.

Les 18 tests backend ignorés exigent des opt-in MySQL et certains utilisent des fixtures persistantes. Ils n’ont pas été activés contre `lca_recette`, conformément à l’interdiction d’altérer les données existantes.

## Réserves prioritaires

1. `STOCK-001` — transfert inter-agences non implémenté de bout en bout.
2. `STOCK-002` — absence de filtre par plage de prix.
3. `STOCK-003` — absence de tri utilisateur.
4. `CLIENT-001` — édition du client non accessible depuis la fiche 360°.
5. `CLIENT-002` — suppression physique des contacts, sans historique fonctionnel.
6. `CRM-001` — pas d’archivage/désactivation explicite d’un prospect.

## Décision de clôture

Le socle est exploitable pour une recette métier encadrée. La mise en production d’un flux de transfert inter-agences doit rester bloquée jusqu’à arbitrage et implémentation d’une autorisation explicite côté agence destination. Les autres réserves sont non bloquantes pour les flux courants, mais doivent être planifiées.
