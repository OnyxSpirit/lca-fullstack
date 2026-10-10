# FIN-09 — Registre consolidé des réserves

| ID | Lot | Réserve | Gravité / impacts | Traitement et preuve | Statut final |
|---|---|---|---|---|---|
| RES-01 | FIN-03 | Baseline historique attendue à tort en 064 | P2, maintenance des tests | Assertions remplacées par le marqueur réel `baseline_001_071`; tests Treasury réussis | CORRIGÉE ET TESTÉE |
| RES-02 | FIN-03 | Audit Treasury attendu par SQL direct | P2, fausse alerte QA | Test aligné sur `writeAudit`, mécanisme central réellement utilisé | CORRIGÉE ET TESTÉE |
| RES-03 | FIN-03 | Une sortie libre pouvait consommer les liquidités réservées | P0, sous-couverture et paiement promis impossible | Verrou compte/réservations dans `postMovement`; scénario 5 M / 4 M / 3 M refusé sur MySQL 8.4; course de deux sorties : un seul succès | CORRIGÉE ET TESTÉE |
| RES-04 | FIN-04 | Salaire historique assimilable à un net légal | P1, compréhension utilisateur | L’interface et le rapport le qualifient de montant contractuel de référence; aucun calcul légal implicite | ACCEPTÉE AVEC JUSTIFICATION |
| RES-05 | FIN-06 | Reconstruction historique imparfaite pour certains états annulés après `asOf` | P1, analyse historique | Limite annoncée dans `meta.historicalLimitations`; aucune réécriture historique inventée | ACCEPTÉE AVEC JUSTIFICATION |
| RES-06 | FIN-07 | Pas de connexion bancaire directe ni de rapprochement multiple | P2, productivité | Fonctionnalités explicitement hors périmètre; aucun mouvement automatique inventé | HORS PÉRIMÈTRE |
| UX-01 | FIN-08 | Recette navigateur absente | P1, validation utilisateur | Navigateur non exécuté pendant FIN-09; protocole manuel fourni dans la matrice | NON TESTÉE |
| UX-02 | FIN-08 | Responsive validé statiquement uniquement | P2, ergonomie tablette | Classes et débordements couverts statiquement, rendu réel non exécuté | NON TESTÉE |
| UX-03 | FIN-08 | Dialogues natifs historiques subsistants | P1, accessibilité/actions sensibles | Inventoriés dans facturation, RH, transfert/contrepassation Treasury et livraison; aucune nouvelle occurrence créée | OUVERTE |
| UX-04 | FIN-08 | Statuts techniques et remise à zéro inégale des filtres | P2, lisibilité | Couverture statique présente; harmonisation exhaustive non réalisée | OUVERTE |
| RES-07 | FIN-09 | Tests MySQL FIN-01 à FIN-05 ont une assertion de version figée au niveau du lot | P2, maintenabilité QA | Bootstrap 076 validé séparément; tests statiques passent; leurs recettes MySQL antérieures sont documentées mais non rejouées sous FIN-09 | OUVERTE |
| RES-08 | FIN-09 | Décaissement budgétaire non lié à une réservation conserve le comportement FIN-03 | P1, couverture | Le garde central protège les sorties libres; le flux budgétaire reste régi par son contrôle de solde et sa consommation explicite lorsqu’une réservation est fournie | ACCEPTÉE AVEC JUSTIFICATION |

