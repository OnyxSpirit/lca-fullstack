# Rapport de tests E2E navigateur

## Environnement

Navigateur intégré connecté au vrai frontend 4176 et backend 3004. Compte : `audit.commercial.ui@recette.invalid`, rôle et données suffixés `b0bd7910`.

## Scénarios exécutés

1. Vente directe : client → véhicule → remise invalide puis valide → garantie → création.
2. Confirmation sans facture : réussite, statut financement validé, préparation bloquée.
3. Facture : création, émission, archive, encaissement intégral, reçu archivé.
4. Préparation : statut préparation puis prêt à livrer.
5. Livraison : candidat, responsable, rendez-vous, checklist 10/10, qualité, ready, finalisation sans tracé de signature.
6. Showroom : recherche, affectation, prise en charge, essai, retour kilométré.
7. Devis CRM : création, calcul, émission, archive, éligibilité conversion.
8. Devis vers pro forma : brouillon distinct créé.
9. Pro forma autonome : création, modification, émission et archive.

## Résultats transversaux

- S1 Showroom→prospect→devis : PARTIEL, la visite et le prospect fixture sont distincts ; chaque maillon a été testé, pas la conversion continue.
- S2 Prospect→devis→pro forma→vente : PARTIEL, devis→pro forma testé ; vente testée séparément.
- S3 Vente→confirmation→facture : CONFORME au workflow simplifié à une confirmation.
- S4 Vente→encaissement→livraison : CONFORME.
- S5 vente annulée→livraison refusée : CONFORME au niveau MySQL/intégration, NON TESTÉE navigateur.
- S6 véhicule transit→vente/essai : CONFORME par absence des sélecteurs ; livraison non rejouée.
- S7 essai→retour→véhicule : CONFORME.
- S8 changement agence : NON TESTÉE.
- S9 concurrence deux utilisateurs : CONFORME via suites MySQL, NON TESTÉE avec deux navigateurs.
- S10 PDF→contenu→GED : six PDF extraits, six hashes concordants ; NON CONFORME pour l’identité du client dans la pro forma.

## Anomalies E2E

Heure de livraison décalée, avertissement devis trompeur, capture numérique de signature ambiguë, état « documents complets » ambigu.

## Clôture

Les fixtures navigateur ont été supprimées après conservation des preuves. Les scénarios réellement non rejoués restent S1/S2 continus, changement d’agence, deux navigateurs simultanés, réaffectation/annulation showroom et pièce jointe livraison. Verdict E2E : **CONFORME AVEC RÉSERVES sur le nominal**, non-conformités documentaires et temporelles consignées séparément.
