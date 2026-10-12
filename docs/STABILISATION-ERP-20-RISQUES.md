# STABILISATION-ERP-20 — Registre des risques résiduels

Date : 12 octobre 2026

## Critères

- **Bloquant** : compromet l'intégrité, la sécurité ou un parcours indispensable dans le périmètre livré.
- **Majeur** : peut avoir un impact métier important mais dispose d'une condition de maîtrise explicite.
- **Modéré / faible** : dette, limite de couverture ou amélioration n'empêchant pas la livraison cadrée.

| ID | Risque / anomalie ouverte | Sévérité | Impact métier | Probabilité | Réduction requise | Bloquant ? | Recommandation |
|---|---|---|---|---|---|---|---|
| ERP20-R01 | Isolation réelle entre deux concessions non démontrée dans l'environnement recette mono-concession | Majeure si périmètre multi-concession ; modérée sinon | exposition croisée potentielle si le produit est immédiatement ouvert à plusieurs concessions | Faible à moyenne ; prédicats et scopes existent mais la preuve runtime manque | limiter la livraison à la concession actuelle, ou exécuter avant extension un scénario isolé à deux concessions avec utilisateurs/scopes antagonistes et vérifications SQL/API/UI | **Oui uniquement** pour une mise en service multi-concession immédiate | conditionner contractuellement le périmètre de lancement |
| ERP20-R02 | Fenêtre de crash GED après écriture du fichier et avant commit des métadonnées | Majeure | fichier orphelin, occupation disque et écart de traçabilité ; pas de perte de document référencé démontrée | Faible | supervision du stockage, sauvegarde, procédure de rapprochement hash/métadonnées ; ajouter un job de réconciliation et un test isolé avec arrêt brutal | Non pour lancement maîtrisé | inscrire au premier lot post-livraison et surveiller |
| ERP20-R03 | MySQL recette porte une dérive Compose historique (fusion de deux fichiers, deux montages init et un réseau supplémentaires) | Majeure opérationnelle | recréation accidentelle ou modification de topologie lors d'une commande Compose trop large | Moyenne en cas d'opération manuelle non cadrée | ne jamais lancer un `up/down` global ; conserver la procédure ciblée documentée ; sauvegarder avant intervention ; corriger la définition dans une fenêtre dédiée validée | Non tant qu'aucune recréation n'est faite | dette DevOps prioritaire, pas de correction improvisée |
| ERP20-R04 | Restauration des sauvegardes non rejouée pendant ERP-20 | Modérée | délai ou surprise lors d'une reprise après incident | Faible à moyenne | effectuer un restore drill hors environnements protégés avec contrôle applicatif et hash des artefacts | Non | prérequis d'exploitation avant engagement RTO/RPO |
| ERP20-R05 | Parcours navigateur exhaustifs par chaque profil dynamique non rejoués en ERP-20 | Modérée | défaut d'affichage ou d'accès rare selon combinaison de scopes | Faible ; tests dynamiques et campagnes précédentes sont verts | smoke-test de la matrice des profils réels après déploiement sur environnement isolé | Non | inclure dans le protocole de préproduction |
| ERP20-R06 | Conversion générique prospect→client reste une décision métier | Modérée | attente fonctionnelle ambiguë, pas une perte de données connue | Moyenne si attendue au lancement | faire valider la règle et les critères d'acceptation par le métier | Non sauf engagement contractuel contraire | arbitrage produit avant communication utilisateurs |
| ERP20-R07 | Confirmation de certaines actions sensibles encore fondée sur une interaction navigateur native | Faible | ergonomie et homogénéité, sans contournement d'autorisation | Moyenne | remplacer par un dialogue applicatif auditable lors d'un lot UX | Non | amélioration post-livraison |
| ERP20-R08 | État de livraison non figé : modifications ERP-19/20 présentes dans le worktree sans commit de release | Majeure de processus | artefact non reproductible, risque d'oubli ou de mélange lors de la livraison | Élevée si livraison immédiate depuis le répertoire courant | revue humaine du diff, sélection des fichiers attendus, commit/tag signé dans le processus autorisé, CI et construction d'un artefact traçable | **Oui pour publier maintenant** | ne pas livrer directement le worktree courant |

## Anomalies bloquantes

Aucun défaut fonctionnel P0/P1 connu ne reste ouvert pour un déploiement **mono-concession** maîtrisé. ERP20-R01 devient bloquant si la livraison inclut immédiatement plusieurs concessions. ERP20-R08 bloque la publication directe du répertoire de travail, mais pas la qualification fonctionnelle du produit après passage par un processus de release contrôlé.

## Scénarios de levée recommandés

### Isolation multi-concessions

Créer une base éphémère distincte, deux concessions, au moins deux agences et quatre utilisateurs couvrant AGENCY/CONCESSION/GLOBAL. Exécuter lectures et mutations croisées sur clients, véhicules, ventes, OR, pièces, documents et reporting. Vérifier simultanément les statuts HTTP, les jeux de résultats et les lignes SQL. Détruire uniquement cet environnement éphémère après collecte des preuves.

### Crash GED

Dans un conteneur ou processus jetable, injecter un arrêt après le renommage atomique du fichier mais avant le commit SQL. Au redémarrage, exécuter un rapprochement stockage/métadonnées, vérifier l'absence de doublon au rejeu et la mise en quarantaine de l'orphelin. Ce scénario ne doit jamais cibler les volumes `lca` ou `lca-recette`.

### Docker / restauration

Restaurer les sauvegardes ERP-17/ERP-19 dans des volumes neufs et isolés, démarrer sous un autre nom de projet et d'autres ports, puis vérifier healthchecks, version MySQL, comptages métier, GED et authentification. La dérive du MySQL recette doit être corrigée ultérieurement par une migration planifiée, jamais par recréation implicite.
