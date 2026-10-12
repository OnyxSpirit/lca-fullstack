# STABILISATION-ERP-22 — Bilan final

Date : 12 octobre 2026

## Verdict

**RESTAURATION QUALIFIÉE SOUS RÉSERVES**

La version candidate RC2 est installable, sauvegardable et restaurable intégralement dans un environnement Docker indépendant. Les données, relations, montants, statuts, rôles dynamiques, scopes, documents GED et uploads ont été préservés et vérifiés.

Les réserves ne portent pas sur le résultat technique de la restauration de qualification. Elles concernent la sécurité opérationnelle, la distribution et la production.

## Décisions distinctes

| Objet | Décision |
|---|---|
| Qualification de l'installation RC2 | **Qualifiée sous réserves**, conformément à la Phase 1B |
| Qualification technique de la restauration | **Qualifiée** sur le jeu fictif ERP-22 |
| Sécurité des dépendances | **0 vulnérabilité de production signalée** lors de la Phase 1B |
| Verdict global ERP-22 | **RESTAURATION QUALIFIÉE SOUS RÉSERVES** |
| Distribution RC2 | **Non autorisée** tant que les anciens accès exposés ne sont pas révoqués/renouvelés |
| Transmission du dépôt Git | **Interdite en l'état** à cause de l'historique sensible |
| Production | **Non autorisée** par cette mission |

## Preuves principales

- archive RC2 : SHA-256 `31e3f8cd13a8826c1eca756e16674e6830b17b8f063c548ac6d05d9ea8b177a6`, 786 fichiers, 0 lien symbolique ;
- sauvegarde complète : MySQL, GED, uploads, manifeste, version, inventaires et prérequis ;
- contrôles SHA-256 de sauvegarde : tous réussis ;
- comparaison SQL avant/après : identique ;
- comparaison GED avant/après : identique ;
- comparaison uploads avant/après : identique ;
- 152 tables, 9 migrations jusqu'à 79 ;
- relations et montants financiers inchangés ;
- aucun GED manquant ou orphelin ;
- 19/19 contrôles de reprise API/JWT/RBAC/GED/Socket.IO ;
- cible `lca-restauration` : trois services healthy, aucun redémarrage ;
- aucune erreur critique dans les journaux ;
- restauration totale mesurée : 119 secondes sur données fictives.

## Environnements préservés

Tous les identifiants antérieurs sont inchangés et les services sont healthy avec zéro redémarrage :

- `lca` : backend `4a51ed2e0913`, frontend `8ba5b4b9792a`, MySQL `9b37c86b3190` ;
- `lca-recette` : backend `288107bcdb0f`, frontend `c80eae9753b5`, MySQL `5e7de0bab86f` ;
- `lca-qualification` : backend `dc89e4304bbf`, frontend `c1e22fc742df`, MySQL `0007a9965dc7` ;
- `lca-requalification` : backend `c345235da0b5`, frontend `89bbb543bc7f`, MySQL `b0a42a5e179d`.

Le nouvel environnement `lca-restauration` emploie des conteneurs, volumes, réseaux, ports et secrets distincts. Aucun volume historique, de recette ou de qualification n'y est monté.

## Corrections et non-régression

Aucune correction du code principal n'a été nécessaire pendant la Phase 2. RC2 n'a donc pas été présentée comme contenant une modification postérieure à son export. Les changements Git existants de Phase 1B ont été préservés ; aucun commit, push, tag, reset, restore, stash ou clean n'a été exécuté.

## Réserves restantes

1. Les six accès historiquement exposés doivent être révoqués ou renouvelés ; leur rotation n'est pas présumée.
2. L'historique Git sensible ne doit pas être transmis.
3. Les sauvegardes de production doivent être chiffrées, signées ou protégées par un mécanisme d'authenticité, répliquées hors hôte et soumises à une politique de rétention.
4. La stratégie de cohérence doit être industrialisée : fenêtre d'écriture bloquée, orchestration contrôlée, supervision et alerte.
5. Les scripts historiques aux noms de volumes codés en dur doivent être paramétrés et retestés avant usage multi-environnement.
6. Les performances mesurées sur ce faible volume ne préjugent pas des durées de production.
7. Une autorisation explicite de sécurité, d'exploitation et métier reste nécessaire avant toute distribution ou mise en production.

## Livrables et artefacts

- procédure et preuves de sauvegarde : `docs/STABILISATION-ERP-22-SAUVEGARDE.md` ;
- procédure et preuves de restauration : `docs/STABILISATION-ERP-22-RESTAURATION.md` ;
- sauvegarde temporaire de qualification : `/tmp/erp22-phase2-backup` ;
- extraction et Compose temporaires : `/tmp/lca-restauration.erp22/source` ;
- archive RC2 et manifeste d'origine conservés sans modification.

La réussite de cette restauration démontre la restaurabilité technique de RC2 sur le jeu de qualification. Elle ne vaut ni autorisation de distribution, ni homologation sécurité complète, ni feu vert de production.
