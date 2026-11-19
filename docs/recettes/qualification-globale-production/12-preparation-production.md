# Préparation à la production

Avant déploiement : générer les secrets dans un gestionnaire dédié, sauvegarder et tester la restauration, vérifier les checksums de migrations sur une copie, exécuter les E2E critiques, établir supervision/alertes, tester le rollback applicatif sans rollback destructif de schéma, et contrôler les volumes GED/uploads.

La configuration de qualification n'est pas une configuration de production. Aucun déploiement n'a été effectué.

Les deux réserves majeures QGP-UI-001/002 sont closes. La qualification locale confirme compilation, pagination SQL, isolation agence, 2FA, agrégats fiscaux et non-régression. Restent des opérations d'exploitation préalables au déploiement (sauvegarde/restauration, supervision, capacité et rollback) ; elles ne constituent pas des anomalies applicatives corrigibles dans ce worktree.
