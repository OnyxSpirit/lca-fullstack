# Audit MySQL et migrations

## État observé

- baseline 001 et migrations incrémentales jusqu'à 132 présentes;
- base locale : migrations appliquées jusqu'à `132_rbac_scope_bootstrap_guard.sql`;
- `role_permissions` local : 397 lignes, dont 395 `AGENCY`, 2 `OWN`, 0 hors domaine;
- `service_stamps` local : 0 ligne; `service_stamp_categories` local : 0 ligne.

Ces comptages ont été effectués en lecture seule. Aucune donnée n'a été créée, modifiée ou supprimée.

## RBAC

La baseline contient historiquement `ENUM('OWN','AGENCY','CONCESSION','GLOBAL')`. Les migrations antérieures à 131 attribuent encore fréquemment `GLOBAL`. Ce n'est acceptable que parce qu'une installation complète exécute ensuite :

1. migration 131 : historique des décisions, réduction des deux anciens scopes vers `AGENCY`, suppression des valeurs nulles, réduction de l'ENUM;
2. migration 132 : purge défensive des valeurs invalides et contrainte `CHECK`.

Risque : toute base arrêtée avant 131 reste incompatible avec le code actif. Le démarrage/déploiement doit donc bloquer si la migration terminale n'est pas appliquée.

## Cachets

Le schéma autorise un `agency_id` nullable et un `department_id` nullable. Les catégories appartiennent à la concession. Le code actif de lecture/gestion ne voit que `agency_id = agence active`, tandis que la création et les politiques conservent encore des chemins avec agence nulle. Cette divergence est AUD-API-001.

Avant toute correction, une requête de qualification en production doit compter : cachets centraux, cachets par agence, départements incompatibles, catégories inter-concession, versions actives multiples et politiques référençant des cachets inactifs/révoqués. Elle devra rester en lecture seule dans la phase d'audit.

## Identité et logo

Les informations légales et fiscales sont dans `concessions`; le logo est stocké en `LONGBLOB` avec son MIME. Le rattachement concession est cohérent avec une ressource centrale. Aucun besoin structurel n'impose que l'auteur soit Super Admin.

## Intégrité et risques

- les clés étrangères et transactions observées limitent les orphelins sur les domaines sensibles;
- les migrations 131/132 sont irréversibles sur la sémantique des anciens scopes : l'historique dédié doit être conservé;
- aucun inventaire de données de production n'a été possible;
- l'absence de cachets dans la base locale empêche de qualifier les données historiques réelles.
