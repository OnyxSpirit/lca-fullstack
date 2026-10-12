# ERP-18 — GED

## Validation isolée

Le test ERP-17 de reprise facture Atelier est vert : échec de rendu, échec d'insertion avec nettoyage, reprise et rejeu sans doublon. Les tests de prévisualisation, téléchargement protégé, hash et immuabilité sont verts. Aucun fichier de recette n'a été supprimé ou réécrit ; les documents restent au nombre de 46.

## Suite historique désynchronisée

La combinaison ciblée de quatre fichiers donne 28 succès et 10 échecs. Neuf échecs sont des assertions statiques dépendant d'anciennes formes de code (`e.agency_id`, appel direct à `resolveDocumentEntity`, filtre `document_type`) alors que l'implémentation a été refactorée vers les prédicats documentaires courants. L'échec `GED-AUTO-09/10` attend deux appels d'archivage Livraison alors que l'implémentation idempotente actuelle n'en produit qu'un.

Ces échecs ne démontrent pas une fuite de données ni une corruption, mais constituent une dette de harnais à réconcilier par revue indépendante. Les tests n'ont pas été modifiés pour les rendre verts.

## Limite maintenue

La panne complète du processus entre écriture fichier et commit SQL n'a pas été provoquée sur l'environnement partagé. La réconciliation automatique d'un éventuel fichier orphelin reste non démontrée.

## Verdict

**PARTIEL.** Reprise transactionnelle simulée et intégrité historique validées ; harnais GED historique et scénario crash-processus restent réservés.
