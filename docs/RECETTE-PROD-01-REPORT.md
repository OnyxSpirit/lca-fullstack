# RECETTE-PROD-01 — Rapport final de préproduction

Date de recette : 10 octobre 2026. Branche `main`, HEAD initial `8bcbadb`, arbre propre. La dernière migration est `076_bank_reconciliation.sql`; aucune migration historique n'a été modifiée et aucune migration n'a été ajoutée.

## Verdict exécutif

- Verdict technique : **VALIDÉ AVEC RÉSERVES**.
- Verdict production : **NON APTE À LA PRODUCTION** à cette date.

Les invariants financiers critiques vérifiés sur MySQL 8.4 sont conformes : protection des réservations, concurrence RH et fournisseurs, reporting/export et rapprochement bancaire. En revanche, trois conditions de FIN-09 ne sont pas totalement levées : recette navigateur impossible dans l'environnement, matrice API inter-périmètres non exécutée de façon exhaustive pour chaque ressource, et commande de tests globale non verte. Des dialogues natifs subsistent aussi sur des actions financières sensibles.

## Environnement isolé

Un conteneur `mysql:8.4` temporaire nommé `lca-recette-prod01-mysql-20261010`, en `tmpfs`, sans volume persistant, a été exposé uniquement sur `127.0.0.1:13384`. Le backend et le frontend temporaires ont utilisé respectivement les ports 4317 et 5173. Un compte de recette a été provisionné uniquement dans cette base. Aucun service existant, VPS ou environnement de production n'a été touché.

Le bootstrap vierge a appliqué la baseline 071 puis les migrations 072 à 076 et a annoncé `Database EMPTY; niveau >= 76`.

## Résultats financiers dynamiques

| Domaine | Preuve | Résultat |
|---|---|---|
| Rémunérations | Workflow authentifié, snapshot salaire/prime, validation séparée, acompte, réservation et mouvement Treasury sur schéma 076 | RÉUSSI |
| Concurrence RH | Deux préparations simultanées ne créent qu'une rémunération; paiement partiel exact | RÉUSSI |
| Fournisseurs | Facture, validation, budget, deux paiements simultanés, avoir et dette finale | RÉUSSI : statuts 201/409, un seul mouvement |
| Réservations | 5 M disponibles, 4 M réservés, sortie libre incompatible et deux sorties concurrentes | RÉUSSI : réserve intacte, un seul succès concurrent |
| Reporting | Six sections, séparation des devises et export CSV BOM | RÉUSSI |
| Banque | Import, validation, rapprochement concurrent, annulation et immutabilité Treasury | RÉUSSI |
| Build backend | typage et compilation | RÉUSSI |
| Build frontend | typage et build Vite (2487 modules) | RÉUSSI |

Les recettes FIN-04 et FIN-05 ont été rejouées sur la base réellement au niveau 076 au moyen de copies d'exécution temporaires ne modifiant que leur assertion de niveau attendue. Le dépôt n'a pas été modifié pour cette adaptation.

## RBAC et confidentialité

Les routes financières conservent `requirePermission`, les scopes persistés et les prédicats serveur. Les scénarios dynamiques exécutés prouvent notamment le refus de l'auto-validation RH, le refus sans double permission lors d'un décaissement budgétaire, les scopes Treasury et le contrôle d'accès aux exports testés. Les appels sans JWT sont couverts par la suite applicative.

La condition exigeant, pour chacune des douze familles de ressources, toutes les combinaisons lecture/mutation/export avec OWN, AGENCY, CONCESSION, GLOBAL, inter-agence, inter-concession et sans permission n'a toutefois pas été entièrement exécutée par API dans cette mission. Aucune conclusion exhaustive n'est donc revendiquée.

## Navigateurs, UX et accessibilité

Le frontend et l'API ont été démarrés, mais l'outil de recette a répondu `Browser is not available: chrome`. Aucune capture ni validation visuelle n'est annoncée. Les quatre livrables alternatifs sont fournis dans les documents `RECETTE-PROD-01-RESPONSIVE.md`, `RECETTE-PROD-01-CLAVIER.md`, `RECETTE-PROD-01-PROTOCOLE-ACCEPTATION.md` et `RECETTE-PROD-01-DIALOGUES-NATIFS.md`.

Les composants partagés `Modal`, `Button` et `Tabs` conservent les améliorations FIN-08. Des `prompt`/`confirm` natifs restent cependant présents dans Treasury, rémunérations, facturation et autorisation financière de livraison. Ils sont inventoriés comme réserve P1 lorsqu'ils déclenchent ou annulent une opération financière.

## Non-régression

Les cinq suites MySQL financières ciblées de cette recette sont vertes. Les typages et builds backend/frontend sont verts. La commande globale `npm test` n'est pas un signal exploitable de mise en production : plusieurs tests historiques échouent et `auth-session-revocation.test.ts` utilise `mock.module`, indisponible dans l'exécution Node observée. Quelques tests frontend historiques sont également rouges. Ces échecs n'ont pas été corrigés sans anomalie métier démontrée, conformément au périmètre strict, mais bloquent un feu vert production.

## État final

Aucune modification fonctionnelle ou migration n'a été nécessaire. Les seuls ajouts sont les livrables de recette. Les ressources temporaires sont supprimées à la clôture. Aucun commit, push, déploiement, accès VPS ou écriture persistante n'a été effectué.

