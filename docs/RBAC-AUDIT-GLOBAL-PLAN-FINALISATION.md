# Plan unique de finalisation intégrale du RBAC multi-agences

Ce plan constitue **un seul lot global de livraison**. Les séquences ci-dessous sont des dépendances techniques internes, pas des missions séparées.

## Matrice des actions

| ID | Domaine/endpoints | Problème | Correction attendue | Dépendances | Criticité | Tests/critère de validation |
|---|---|---|---|---|---|---|
| FIN-001 | 52 routes G suspectées | Garde non résolue par l’audit | Confirmer helper/héritage ; ajouter garde explicite si absence réelle | Aucune | ÉLEVÉ | Test HTTP sans permission = 403 pour chaque absence réelle |
| FIN-002 | Livraisons 35 | 20 hybrides, 15 historiques | Routeur, services, checklists en OWN/AGENCY ; wrappers frais | DEC-08 | ÉLEVÉ | Isolation A/B, retrait concurrent, finalisation atomique |
| FIN-003 | Facturation 21 + retours 17 | Ancien scope sur argent/avoirs | Agence dérivée, permissions fraîches, idempotence | FIN-002 | CRITIQUE | Paiement/annulation/remboursement concurrents MySQL |
| FIN-004 | Trésorerie 52 | Comptes concession/global | Mandats explicites, double autorisation, SoD | DEC-03/06 | CRITIQUE | Aucun mouvement étranger ; rapprochement et reversal atomiques |
| FIN-005 | Pièces 62 | Helper historique, transferts | OWN/AGENCY, stocks par agence, autorité destination | DEC-01/02 | ÉLEVÉ | Réservation, transfert, inventaire et vente concurrents |
| FIN-006 | Atelier 88 | Dépend de pièces/facturation | Migrer OR, planning, techniciens, garanties, SAV | FIN-003/005 | ÉLEVÉ | OR A/B, pièces, facture, abandon, remise véhicule |
| FIN-007 | RH/prestataires 136 | Scopes historiques, données sensibles | Modèle OWN/AGENCY/central explicite | DEC-01/04 | ÉLEVÉ | Dossier personnel, manager, paie, congé, prime, prestataire |
| FIN-008 | GED/marques 34 | Agence ambiguë, routes dupliquées | Dériver du parent ; stratégie marque par type | DEC-07 | ÉLEVÉ | Téléchargement étranger refusé, hash/archive/signature |
| FIN-009 | Paramètres 25 | Gouvernance mixte | Séparer central, concession, agence | DEC-01 | MOYEN | Vrai Super Admin uniquement pour central |
| FIN-010 | Clients 360 | Producteurs hybrides | Migrer après producteurs, filtrer chaque union | FIN-002–008 | ÉLEVÉ | Aucune section ne révèle une autre agence |
| FIN-011 | Reporting/dashboard/activity 27 | Consolidation indéfinie | Portefeuille explicite et SQL filtré à la source | DEC-03, producteurs | ÉLEVÉ | Agrégats identiques au détail autorisé |
| FIN-012 | Utilisateurs/auth 56 | Identité centrale et rôles locaux mélangés | Éliminer rôles locaux historiques, sécuriser admin 2FA | Tous consommateurs | ÉLEVÉ | Retrait de rôle/session immédiat, dernier SA protégé |
| FIN-013 | Modules B (95) | Implémentés mais preuves incomplètes | Recettes MySQL Showroom/Clients/Devis/Proformas/Ventes/Véhicules | Données isolées | MOYEN | Tests négatifs et concurrence réussis |
| FIN-014 | SQL | Colonnes/index/provenances manquants | Migrations additives numérotées, reprises vérifiables | Décisions | ÉLEVÉ | Migration à blanc et réexécution contrôlée MySQL 8.4 |
| FIN-015 | Socket.IO | Producteurs historiques/global inopérant | Rooms explicites et émissions après commit | Modules migrés | ÉLEVÉ | Tests multi-sessions, changement agence, révocation |
| FIN-016 | Collisions | 4 clés dupliquées | Documenter chaîne ou fusionner sans changer contrat | FIN-003/005/008 | MOYEN | Tests d’ordre/accessibilité |
| FIN-017 | Validation finale | Couverture fragmentée | Suite backend complète + matrices route par route | Tous | CRITIQUE | 664 classifications réconciliées, lint/build/tests verts |

## Ordre d’exécution interne

1. Geler la matrice des décisions et écrire les migrations additives.
2. Fermer les anomalies démontrées et finaliser Livraisons.
3. Migrer la chaîne financière Facturation/Retours/Trésorerie.
4. Migrer Pièces puis Atelier/SAV.
5. Migrer RH/prestataires et GED/marques.
6. Finaliser paramètres, utilisateurs/auth et Socket.IO.
7. Refaire Client 360, reporting, dashboards et audit après tous leurs producteurs.
8. Exécuter recettes MySQL, concurrence, isolation, suite backend complète et réconcilier les 664 endpoints.

## Critères de clôture du lot final

- Aucun endpoint métier n’utilise `GLOBAL`, `CONCESSION`, `users.agency_id` ou `user_roles` comme autorité locale implicite.
- Chaque endpoint a une classification finale A ou E, une permission, une origine d’agence et, si OWN, une règle propriétaire.
- Chaque écriture sensible revalide contexte/permission dans la transaction et verrouille la ressource.
- Toute opération inter-agences vérifie séparément source et destination.
- Toutes les émissions temps réel sont post-commit et ciblées.
- Migrations MySQL 8.4, lint, build et suite backend complète réussissent ; aucun test frontend/E2E n’est requis par ce lot backend.
