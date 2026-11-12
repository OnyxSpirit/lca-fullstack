# ERP LCA — Lot 5 : comptabilité avancée

## Périmètre livré

Le lot 5 ajoute une couche d’exploitation au moteur en partie double des lots précédents : grand livre paginé avec solde progressif, balance générale, balance auxiliaire des tiers identifiés, synthèse des journaux et contrôle de leur séquence. Les analyses ne retiennent que les écritures comptabilisées ou contrepassées et respectent le périmètre agence, concession ou global porté par le RBAC.

Le centre de contrôles conserve chaque exécution et chaque anomalie. Il vérifie notamment l’équilibre, la cohérence date/période, l’utilisation de comptes actifs et imputables et l’unicité des sources métier. La clôture d’une période impose une préparation sans anomalie bloquante, verrouille les lignes concurrentes et laisse une trace d’audit. Une réouverture exige un motif explicite et est également auditée.

Les exports du grand livre et de la balance sont disponibles en CSV UTF-8, Excel et PDF depuis `/treasury/accounting`. L’interface regroupe les fonctions en trois espaces lisibles : analyses, contrôles/clôtures, états/échanges.

## Migration et sécurité

La migration `122_accounting_advanced.sql` crée les historiques de contrôles et clôtures, les préparations de reports, les modèles d’états, les profils d’échange et leurs exécutions. Elle ajoute les permissions fines du lot 5 et les attribue globalement au rôle système `SUPER_ADMIN`. Les endpoints continuent d’exiger une agence active et appliquent la portée de la permission.

## Réserves réglementaires assumées

Aucune nomenclature détaillée et validée des états financiers SYSCOHADA n’a été trouvée dans le dépôt. L’architecture de modèles et de correspondances est donc prête, mais aucun écran ne présente un résultat comme un état officiel. La clôture annuelle et la génération effective des à-nouveaux restent bloquées tant que le journal, les comptes de contrepartie et les règles d’affectation du résultat ne sont pas validés.

Aucune version Sage ni spécification de format cible n’a été fournie. Le produit livre donc des exports comptables génériques et une architecture de profils/adaptateurs ; il ne revendique pas une compatibilité Sage non testée. L’import doit rester interdit tant qu’un profil précis n’a pas le statut `VALIDATED`.

## Validation

- compilation TypeScript du backend ;
- build de production Vite du frontend ;
- tests statiques du lot 5 portant sur le schéma, les endpoints, le verrouillage et les formats d’export ;
- migration à exécuter sur une base MySQL de recette sauvegardée avant toute mise en production.

## Dette externe connue

L’audit des dépendances des lots précédents signale des vulnérabilités transitives dans `body-parser`/`qs` via Express et dans `uuid` via ExcelJS, sans mise à niveau corrective compatible identifiée au moment de l’audit. Elles ne sont pas masquées par ce lot et doivent rester suivies dans la maintenance des dépendances.
