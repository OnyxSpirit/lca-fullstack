# Audit global ERP LCA — rapport général

Date d'audit : 23 novembre 2026  
Référence locale : branche `main`, commit `b0d243dc921e9d2eda020c8c1694c30ceb354095` (`2026-11-20T09:04:04+01:00`)  
Verdict : **NON CONFORME**

## Synthèse exécutive

Deux défauts majeurs et reproductibles par analyse du chemin complet frontend/API ont été confirmés.

1. La création d'un cachet et d'une catégorie de cachets depuis l'interface omet `agencyId`. Le backend exige pourtant, avec le scope RBAC `AGENCY`, que l'agence cible soit exactement l'agence active. `null !== agence active` produit le message observé « Portée cachet invalide ». Ce défaut touche aussi le vrai Super Admin, dont les permissions persistées sont désormais `AGENCY`.
2. Les écritures sur les ressources centrales sont exposées dans le frontend aux utilisateurs titulaires de permissions `AGENCY`, mais le backend impose en plus `isSuperAdmin`. L'identité fiscale, le logo, les paramètres généraux et plusieurs référentiels centraux sont donc artificiellement interdits à un utilisateur ordinaire pourtant habilité.

Les anciens scopes RBAC `GLOBAL` et `CONCESSION` ne sont pas la cause de ces deux défauts. Le code actif ne reconnaît que `OWN` et `AGENCY`; les migrations 131 et 132 normalisent puis contraignent la base. La base locale inspectée contient 395 attributions `AGENCY`, 2 `OWN` et aucune attribution invalide.

## État réel observé

| Élément | Observation |
|---|---|
| Dépôt | Branche `main`, commit ci-dessus |
| État initial | `docs/guides-utilisateurs/` était déjà non suivi; il n'a pas été modifié |
| Runtime hôte | Node 24.11.1, npm 11.7.0 |
| Frontend | React 19, Vite 6, TypeScript 5.8 |
| Backend | Node/Express 5, TypeScript 5.9, `mysql2` |
| MySQL local | MySQL 8.4, migrations appliquées jusqu'à 132 |
| Docker local | frontend, backend et MySQL sains; images créées le 20 et le 14 novembre 2026 |
| Production | Aucun accès ni identifiant de version exploitable; non vérifiée |

Le Docker local ne constitue pas une preuve que le déploiement de production sert exactement ce commit. Les images ne fournissent pas, dans les éléments accessibles, de provenance Git permettant la corrélation.

## Méthodologie

- inventaire des routes frontend et des routeurs backend;
- suivi des contrats frontend/API/SQL pour les deux incidents;
- analyse des middlewares JWT/RBAC, de l'agence active et des transactions verrouillées;
- classification des occurrences `GLOBAL`/`CONCESSION`;
- lecture du schéma, des migrations 001 à 132 et interrogation en lecture seule de la base locale;
- inventaire des modules, permissions, uploads, documents et opérations sensibles;
- compilation TypeScript et exécution des suites existantes;
- aucune mutation du code, des permissions, des rôles ou des données.

## Résultats principaux

| ID | Gravité | Résultat |
|---|---:|---|
| AUD-CONCESSION-001 | MAJEURE | Création de cachet et de catégorie impossible depuis l'UI avec `AGENCY` |
| AUD-RBAC-001 | MAJEURE | Ressources centrales réservées au rôle système malgré les permissions attribuables |
| AUD-API-001 | MODÉRÉE | Contrat d'agence implicite et divergent entre UI et API pour les cachets |
| AUD-TEST-001 | MODÉRÉE | Tests contournant le contrat UI et assertions consacrant une règle centrale obsolète |
| AUD-TEST-002 | MINEURE | Une assertion backend VIN est obsolète par rapport au message actuel |

Les contrôles structurants multi-agences sont globalement solides : agence active portée par la session, recalcul des rôles par affectation, invalidation par version de contexte, relecture/verrouillage de l'autorisation lors des écritures, scopes persistés stricts. Aucun contournement RBAC actif fondé sur `GLOBAL` ou `CONCESSION` n'a été confirmé.

## Risques

- blocage d'opérations de configuration essentielles;
- divergences répétées entre boutons visibles et refus API;
- impossibilité d'administrer des ressources centrales sans compte système;
- cachets centraux historiques (`agency_id IS NULL`) invisibles et inutilisables dans le modèle actif;
- couverture automatisée donnant un faux sentiment de sécurité sur les contrats intégrés.

## Limites

- la production n'était pas accessible; aucune donnée, configuration, image ou requête de production n'a été inspectée;
- la base locale ne contient ni cachet ni catégorie de cachet, donc l'incident n'a pas été reproduit avec des données existantes;
- les parcours de chaque module ont été vérifiés statiquement et par les tests existants, mais pas rejoués manuellement profil par profil dans un navigateur de recette;
- l'absence de vulnérabilité ne peut pas être déduite d'un audit statique seul.

## Contrôles automatisés exécutés

- TypeScript frontend : succès;
- TypeScript backend : succès;
- frontend : **1 081/1 081 tests réussis**;
- backend, première exécution confinée : 336/358 fichiers réussis, 22 fichiers empêchés principalement par l'ouverture de sockets locaux;
- réexécution hors confinement des 22 fichiers : **423/424 tests réussis**, un échec d'assertion de libellé VIN (AUD-TEST-002). Les scénarios HTTP/PDF initialement empêchés ont alors réussi.

Les tests MySQL conditionnels qui ont été exécutés utilisaient l'environnement local de test; aucune production n'a été ciblée.

## Justification du verdict

Le verdict **NON CONFORME** est retenu parce que deux exigences centrales sont contredites par des chemins actifs et confirmés. Il ne constitue pas une validation de la production : la qualification du déploiement reste à réaliser dès qu'un accès en lecture seule et une provenance d'artefact seront disponibles.
