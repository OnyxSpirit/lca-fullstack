# Rapport général

## Synthèse exécutive

L'anomalie `LCA-RBAC-001` était réelle et reproductible dans le contrat courant. MySQL renvoie les colonnes `BOOLEAN` sous forme numérique `0/1`, tandis que l'interface testait strictement `is_active === false`. Un rôle persisté à `0` était donc présenté comme actif.

La correction normalise désormais les rôles à la frontière API, confirme le statut relu dans la transaction, synchronise les caches de liste et de détail, fournit des notifications françaises et borne le chargement au rôle concerné. La journalisation des rôles contient maintenant l'agence active.

## Anomalies

1. Contrat API non typé pour `is_active` et `is_system` : corrigé.
2. Action UI sans succès/erreur explicite ni protection fiable contre le double clic : corrigée.
3. Audit des rôles enregistré en contexte GLOBAL sans agence active : corrigé.
4. Invalidation React Query non attendue : corrigée pour garantir une relecture cohérente avant la fin de la mutation.

Aucune migration n'a été nécessaire. Les associations, permissions et comptes utilisateurs sont préservés lors du changement de statut.

## Verdict

**VALIDÉ AVEC RÉSERVES.** Le périmètre RBAC rôles et la suite backend complète sont verts. Deux contrôles de structure frontend hors fichiers modifiés échouent dans la suite globale ; les détails et la fluctuation observée sont consignés dans `10-tests-globaux-non-regression.md` et `12-verdict-final.md`.
