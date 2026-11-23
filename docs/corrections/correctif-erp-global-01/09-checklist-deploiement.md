# Checklist de préparation au déploiement

## Avant

- [ ] sauvegarde MySQL vérifiée et restaurable ;
- [ ] inventaire des cachets par propriétaire, dont `agency_id IS NULL` ;
- [ ] sauvegarde GED/cachets ;
- [ ] version frontend/backend/migrations identique ;
- [ ] fenêtre et responsables de retour arrière confirmés.

## Ordre

1. Mettre les écritures concernées en maintenance.
2. Appliquer uniquement la migration 133 et vérifier le registre/checksum.
3. Contrôler table, index, FK, permission et nombre d'affectations propriétaires.
4. Déployer le backend compatible.
5. Vérifier santé, authentification, agence active et création locale.
6. Déployer le frontend.
7. Exécuter la recette cachets, catégories, logo/identité et livraison.

## Après

- [ ] aucune ligne historique `NULL` rendue accessible ;
- [ ] nombre d'affectations initiales égal au nombre de cachets avec propriétaire avant création de nouveaux partages ;
- [ ] utilisateur habilité ordinaire autorisé sur une ressource centrale ;
- [ ] utilisateur non habilité refusé ;
- [ ] cachet partagé utilisable mais non modifiable depuis l'agence cible ;
- [ ] journaux d'audit présents ;
- [ ] documents historiques byte-identiques.

## Retour arrière

Revenir d'abord au frontend précédent, puis au backend précédent. La table additive peut rester en place sans être utilisée. Ne la supprimer qu'après sauvegarde et validation explicite qu'aucun partage nouveau ne doit être conservé. Restaurer la base uniquement si une corruption est constatée, jamais pour un simple rollback applicatif.

## Risques résiduels

Les cachets historiques sans propriétaire nécessitent une décision humaine. Le timeout du sous-test LOT13 de synchronisation par hook doit être rejoué dans l'environnement CI de référence avant autorisation production.

## Décision

La suite backend finale et les builds sont formellement verts. Le lot est **VALIDÉ AVEC RÉSERVES** : ne pas autoriser la production avant la reprise réussie du sous-test LOT13 de synchronisation par hook dans la CI de référence, l'inventaire des cachets historiques sans propriétaire et la validation manuelle des contrôles « Avant » ci-dessus.
