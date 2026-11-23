# Décision de préparation au déploiement

## Verdict

**PRÊT AVEC RÉSERVES.** Le code et la qualification locale sont compatibles avec une préparation de déploiement, mais l'autorisation de production reste conditionnée par les trois prérequis non satisfaits : LOT13 vert dans la CI de référence, inventaire production des cachets historiques, recette UI manuelle signée.

## Prérequis satisfaits

- migration 133 validée sur MySQL 8.4 isolé, checksum connu ;
- intégrations LOT13 et B3.2.1 locales vertes ;
- RBAC et sécurité ciblés sans anomalie critique ou majeure ouverte localement ;
- procédure de retour arrière documentée.

## Avant déploiement

1. Sauvegarder et tester la restauration de MySQL ainsi que du stockage GED/cachets.
2. Exécuter et signer l'inventaire SQL de lecture seule en production.
3. Régulariser séparément les éventuels cachets sans propriétaire, avec preuve métier.
4. Faire réussir LOT13 dans la CI de référence.
5. Exécuter la recette UI avec Super Admin, habilité ordinaire et non habilité.
6. Vérifier que les versions frontend, backend et migrations proviennent du même artefact.

## Ordre

Mettre les écritures concernées en maintenance, appliquer la migration 133, vérifier son registre et ses comptages, déployer le backend, contrôler santé/session/agence active, déployer le frontend, puis exécuter la recette cachets, identité/logo, livraison et audit.

## Vérifications post-déploiement

Comparer cachets propriétaires et affectations, confirmer qu'aucun cachet `NULL` n'est exposé, tester partage A→B→retrait, refus C, utilisateur habilité/non habilité, cachet dans un document compatible, audit et byte-identité des archives historiques.

## Retour arrière

Revenir d'abord au frontend, puis au backend. La table additive peut rester en place. Ne jamais supprimer la table ou restaurer la base sans sauvegarde et validation explicite des partages créés après migration.

## Risques résiduels

État réel de production inconnu, CI non confirmée, recette visuelle non exécutée, sauvegardes et restauration non observées. Ces risques interdisent le verdict `PRÊT POUR DÉPLOIEMENT` à ce stade.
