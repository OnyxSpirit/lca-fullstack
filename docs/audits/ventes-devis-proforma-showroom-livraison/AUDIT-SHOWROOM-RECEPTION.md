# Audit Showroom & Réception

## Cartographie

- UI : `/showroom`, page `ShowroomPage` et modales visite/affectation/essai/retour.
- Backend : `backend-node/src/modules/showroom/showroom.routes.ts` et services de disponibilité.
- Tables : `showroom_visits`, `showroom_test_drives`, `leads`, `opportunities`, `activities`, `vehicles`, notifications/audits.
- Permissions : `showroom.view`, `showroom.visitor.create`, `showroom.assign`, `showroom.visitor.update`, plus CRM lors de conversion.

## Résultats navigateur

- CONFORME : recherche partielle en minuscules sur « visiteur audit ».
- CONFORME : affectation initiale au seul commercial actif/autorisé ; compteur attente 1→0 et affectés 0→1.
- CONFORME : prise en charge ; affectés 1→0, en cours 0→1, arrêt du chronomètre d’attente.
- CONFORME : planification d’essai ; véhicule disponible proposé, véhicules en transit et vendu exclus.
- CONFORME : démarrage de l’essai sans blocage temporel artificiel constaté.
- CONFORME : retour avec kilométrage 12 et retour « Essai concluant audit » ; véhicule libéré et visite remise en entretien.
- CONFORME : notifications de succès visibles et persistance après actualisation.
- PARTIELLE : compteur et états ont été testés sur une seule visite, pas sur plusieurs pages.
- NON TESTÉE navigateur : réaffectation, commercial inactif/autre agence, annulation de visite, rendez-vous CRM, clôture de visite, scopes OWN.

## Preuves automatisées

Les tests ciblés de détection de doublons, endpoint OWN, pagination et matrice de scopes ont réussi hors bac à sable. La suite MySQL réelle valide le doublon concurrent, la conversion concurrente atomique et l’isolation/scopes/FK (3/4). Le scénario rollback par trigger demeure NON TESTÉ : MySQL refuse la création du trigger sans `SUPER` ou `log_bin_trust_function_creators`; la configuration globale n’a pas été abaissée.

## Appréciation

Verdict final : **CONFORME AVEC RÉSERVES**. Le nominal navigateur et la concurrence essentielle sont validés ; réaffectation/rendez-vous/annulation et le rollback injecté restent des limites explicitement non couvertes.
