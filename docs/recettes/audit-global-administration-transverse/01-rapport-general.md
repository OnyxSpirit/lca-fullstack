# 01 — Rapport général

Date d'audit : 17 novembre 2026. Périmètre exclusif : Centre de notifications, Activité utilisateur, Utilisateurs & habilitations, Paramètres concession. Environnement : recette Docker isolée `lca-reporting-ged-hr`, frontend `4178`, API `3006`, MySQL 8.4 `33323`.

L'audit est non correctif : aucun fichier applicatif, test, migration, schéma ou jeu métier n'a été modifié. Seuls les quinze présents rapports ont été créés.

## Résultat consolidé

| Module | Verdict | Motif principal |
|---|---|---|
| Centre de notifications | Incomplet | UI/API et contrats couverts, mais aucune notification dans la recette et intégration MySQL/Socket non exécutable à cause du garde-fou de nom de base. |
| Activité utilisateur | Prêt avec réserves non bloquantes | Journal, filtres, pagination et détail accessibles ; certains détails génériques n'apportent aucun champ métier et 22/46 lignes historiques n'ont pas de contexte territorial. |
| Utilisateurs & habilitations | Prêt avec réserves non bloquantes | Administration, RBAC dynamique, multi-agence et 2FA visibles et couverts par tests ciblés ; validation MySQL dédiée non exécutée. |
| Paramètres concession | Non prêt | Débordement horizontal reproductible à 375×812 ; preuves fonctionnelles et RBAC autrement cohérentes. |

Verdict global : **non prêt pour clôture sans réserve**, en raison du défaut responsive mobile des paramètres et de la couverture MySQL/Socket incomplète sur cet environnement nommé `e2e`.

## Preuves chiffrées

- UI réelle : 4 routes, 12 couples route/viewport, 1 détail d'activité ouvert.
- Frontend ciblé : 23 fichiers de tests, 23 réussis, 0 échec, 0 ignoré.
- Backend ciblé : 34 fichiers de tests, 34 réussis, 0 échec, 0 ignoré.
- MySQL lecture seule : 46 audits, 32 utilisateurs actifs, 24 rôles, 382 permissions, 485 liaisons rôle-permission, 0 liaison orpheline.
- Intégrations MySQL mutantes : 0 exécutée, 4 identifiées mais bloquées par leur garde-fou de nom de base.

