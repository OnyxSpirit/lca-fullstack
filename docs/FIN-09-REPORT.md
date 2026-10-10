# FIN-09 — Audit final et recette financière globale

## A. État Git initial

Branche `main`, HEAD `6714b3a` (`FIN-08`), arbre propre. Dernière migration réellement présente : 076.

## B. Inventaire FIN-01 à FIN-08

Les rapports FIN-03 à FIN-08 existent. Aucun rapport FIN-01/02 n’est présent : leurs commits (`14e7b32`, `fb99164`), migrations, tests et code ont servi d’équivalents vérifiables. Traçabilité : FIN-01 exports Billing; FIN-02 budgets/approbations (072); FIN-03 réservations/couverture (073); FIN-04 rémunérations (074); FIN-05 fournisseurs (075); FIN-06 reporting; FIN-07 rapprochement (076); FIN-08 UX sans migration.

## C. Architecture financière

Les modules partagent MySQL/InnoDB, transactions applicatives, RBAC dynamique, audit centralisé et Treasury. Aucun nouveau module ni registre parallèle n’est ajouté.

## D. Sources de vérité

`treasury_movements` POSTED porte les soldes réels. Billing porte factures/avoirs/encaissements/remboursements; Budgets porte enveloppes et engagements; les réservations portent uniquement l’affectation de liquidité; RH et Fournisseurs portent leurs créances/dettes métier; FIN-06 agrège; FIN-07 contrôle sans écrire Treasury.

## E. Registre des réserves

Le registre détaillé est dans `FIN-09-RESERVES.md`. Une réserve P0 de sous-couverture a été corrigée; deux assertions historiques obsolètes ont été réparées. Les réserves UX et historiques FIN-06 restent ouvertes ou acceptées.

## F. Anomalies financières

Avant correction, une sortie libre pouvait passer sur le seul solde comptable et réduire la trésorerie sous le total réservé. Le cas 5 000 000 / 4 000 000 / 3 000 000 était donc incohérent.

## G. Corrections réalisées

`postMovement` verrouille désormais le compte et les réservations actives avant toute sortie non budgétaire, calcule la trésorerie non affectée et refuse la sortie si elle entame les réservations. Aucune réservation d’autrui n’est libérée ou réduite. Le flux budgétaire FIN-03 conserve sa consommation explicite. Les tests historiques vérifient la baseline 071 et `writeAudit`.

## H. Tests historiques

Ancienne assertion : baseline 064. Nouvelle règle : baseline consolidée réelle 071, puis migrations additives 072–076. Ancienne assertion : `INSERT INTO audit_logs` dans Treasury. Nouvelle règle : appel au service central `writeAudit`. Ces changements rendent les assertions plus fidèles, pas moins précises.

## I. Invariants financiers

INV-01 à INV-18 sont couverts par les suites ciblées et la matrice. INV-03, INV-07, INV-10, INV-13 et INV-14 ont des preuves directes MySQL ou de concurrence. Aucun mélange implicite de devises ni réécriture historique n’a été introduit.

## J–P. Intégrations

Billing, budgets, réservations, RH, fournisseurs, reporting et rapprochement conservent leurs workflows. FIN-06 et FIN-07 ont été rejoués sur MySQL 8.4. Les recettes MySQL FIN-01 à FIN-05 ne sont pas toutes rejouées pendant FIN-09 à cause de versions de bootstrap figées dans leurs tests; leurs suites statiques sont vertes et la dette de test est enregistrée.

## Q. Concurrence

La course FIN-09 de deux sorties de 800 000 sur 1 000 000 non affecté produit exactement un 201 et un 409. Le rapprochement FIN-07 concurrent produit également 201/409. Les concurrences fournisseur/RH ne sont pas rejouées dans ce lot.

## R. RBAC et scopes

Aucun bypass Super Admin. Le seed attribue dynamiquement les permissions actives. Les routes conservent `requirePermission` et les services appliquent OWN/AGENCY/CONCESSION/GLOBAL. Les appels directs inter-périmètres FIN-09 restent partiellement non exécutés.

## S. Confidentialité

Les permissions salariales, bancaires, fournisseurs, rapports, justificatifs et exports restent côté serveur. Aucun stockage public ou nouveau champ sensible n’est ajouté.

## T. Audit

Les services utilisent l’audit centralisé avec auteur et horodatage serveur. Les motifs sont conservés sur rejets, libérations, annulations et contrepassations. Aucun secret ou contenu bancaire intégral n’est écrit dans l’audit.

## U. UX et accessibilité

Les améliorations FIN-08 sont conservées. Les dialogues natifs historiques et certains statuts/filtres restent des réserves. Aucun second système de modales n’est créé.

## V. Recette navigateur

NON EXÉCUTÉE. Aucune capture n’est annoncée. Le protocole manuel figure dans la matrice.

## W. MySQL 8.4

Conteneur temporaire sans volume persistant, base vierge fictive. Bootstrap baseline 071 + migrations 072–076 réussi; seed Super Admin vérifié; garde de réservations et concurrence FIN-09 réussis; reporting/export FIN-06 réussi; import/rapprochement/concurrence FIN-07 réussi.

## X. Tests et non-régression

- Typage backend : réussi.
- Suites backend financières ciblées : réussies après correction des deux assertions obsolètes.
- Suites frontend financières ciblées : 10/10 réussies.
- MySQL FIN-09, FIN-06 et FIN-07 : réussis.
- Build backend/frontend et contrôle final : consignés à la clôture.

## Y. Fichiers modifiés

Code : `backend-node/src/modules/treasury/treasury.service.ts`. Tests : `treasury-foundation.test.ts`, `treasury-manual-operations.test.ts`, `fin03-treasury-coverage.test.ts`, `fin09-mysql.integration.test.ts`. Documentation : les trois fichiers FIN-09.

## Z. Verdict final et état Git

FIN-01 **VALIDÉ AVEC RÉSERVES**; FIN-02 **VALIDÉ AVEC RÉSERVES**; FIN-03 **VALIDÉ**; FIN-04 **VALIDÉ AVEC RÉSERVES**; FIN-05 **VALIDÉ AVEC RÉSERVES**; FIN-06 **VALIDÉ AVEC RÉSERVES**; FIN-07 **VALIDÉ**; FIN-08 **VALIDÉ AVEC RÉSERVES**; FIN-09 **VALIDÉ AVEC RÉSERVES**.

**Aptitude à la production : APTE SOUS CONDITIONS.** Conditions : exécuter la recette navigateur/utilisateur, rejouer les concurrences fournisseur et RH sur une base 076, corriger les versions figées des anciennes recettes MySQL et accepter formellement la limite historique FIN-06. La conformité technique ciblée et le garde financier critique sont validés; la validation utilisateur et la couverture end-to-end exhaustive ne le sont pas.
