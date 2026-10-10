# CORR-ERP-02D — Rapport de fiabilisation des essais automobiles

## Verdict

La double ouverture concurrente d'un essai est corrigée pour le modèle effectivement implémenté : un essai démarre immédiatement et occupe un intervalle ouvert `[started_at, returned_at)`. Un seul essai actif peut désormais exister par véhicule, commercial ou visite. La collision avec un rendez-vous en cours est contrôlée dans les deux sens.

Le CRM reste **validé avec réserves**. Le produit ne contient ni créneau planifié, ni heure de fin prévue, ni durée d'essai, ni API de modification. Il est donc impossible de démontrer honnêtement les chevauchements futurs, l'adjacence et les modifications demandées sans décision métier nouvelle.

## Cause racine

Les deux routes de démarrage lisaient la disponibilité du véhicule avant la transaction, puis inséraient sans verrouiller le véhicule, le commercial, la visite ou les réservations actives. Deux transactions pouvaient donc valider le même état ancien. Aucun contrôle croisé n'existait avec les rendez-vous CRM.

## Correction

- verrouillage InnoDB dans un ordre stable : visite, véhicule, commercial, essais actifs, rendez-vous ;
- relecture autoritaire du véhicule et du kilométrage dans la transaction ;
- insertion et transition CRM dans la même transaction ;
- retry borné à trois tentatives, exclusivement pour `ER_LOCK_DEADLOCK` ;
- annulation sérialisée avec les démarrages concurrents ;
- refus d'un rendez-vous lorsqu'un essai du commercial est actif ;
- erreurs 409 métier opaques, sans identifiant ni donnée de la réservation concurrente ;
- auteur de l'activité de retour renseigné avec l'utilisateur authentifié.

Les contrôles RBAC préexistants restent placés avant l'accès transactionnel. Aucun rôle, scope ou passe-droit n'a été ajouté. Le frontend affichait déjà les messages API : aucune modification visuelle n'était nécessaire.

## Preuves principales

Sur MySQL 8.4.11 jetable, les courses même véhicule et même commercial produisent chacune une création et un conflit. Deux ressources indépendantes sont acceptées. L'annulation concurrente avec un nouveau démarrage conserve au plus un essai actif. La migration 078 a été appliquée puis rejouée sans effet.

La campagne frontend passe de 125/151 à 130/151. Cinq fichiers CRM historiques ont été remis en conformité. Les builds et lints backend/frontend passent. Les échecs globaux restants sont documentés et ne justifient pas une déclaration de mise en production de l'ERP.

## Périmètre opérationnel

Aucun commit, push ou déploiement n'a été effectué. Aucune base persistante, migration historique, volume existant ou service sur le port 3001 n'a été modifié.
