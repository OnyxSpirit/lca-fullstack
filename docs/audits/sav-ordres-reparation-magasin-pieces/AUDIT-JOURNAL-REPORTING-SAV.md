# Audit journal et reporting SAV

## Accès

Même cause racine que SAV-001 : un scope `GLOBAL` dans le contexte multi-agence est transformé en absence de prédicat, donc 403.

## Journal

Recherche OR/facture/client, références, acteurs, dates, montants, motifs et transferts sont exposés. Limites : résultats bornés à 500 + 250 puis 500, sans pagination utilisateur, filtre agence/type/date, tri configurable ni export.

## Reporting

Filtres de période et KPI activité, devis, facturation, encaissements et transit présents. Pas de sélecteur explicite d'agence dans la section ; l'agence active gouverne le scope. Aucun export sur cette vue malgré `service.reporting.export`.

La recette ne contient aucune facture atelier et aucun transfert : cohérence chiffrée réelle non démontrable au-delà des requêtes et tests.

Verdict : **NON CONFORME** pour l'accès ; couverture fonctionnelle **PARTIELLE**.

