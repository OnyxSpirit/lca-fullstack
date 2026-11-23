# Anomalies, causes et corrections

| Référence | Cause racine | Correction |
|---|---|---|
| LCA-PAR-001 | Deux mutations et deux boutons indépendants | Une action orchestre les deux mutations, bloque la double soumission et signale les échecs partiels. |
| LCA-SIG-001 | Canvas dimensionné une fois et tracé dépendant d’un chemin implicite | Pointer capture, prévention tactile, coordonnées CSS, résolution DPR et conservation au redimensionnement. |
| LCA-SIG-002/003 | Politiques déjà persistées par clé agence/document ; mutation React Query partagée | Contrat existant audité ; recette MySQL et concurrence restent requises. |
| LCA-RBAC-001 | La réponse mettait à jour le détail mais pas la liste mise en cache | Mise à jour immédiate du cache `roles`, puis invalidation globale. |
| LCA-I18N-001 | Codes techniques susceptibles d’être rendus directement | Audit statique effectué ; validation visuelle exhaustive réservée. |
| LCA-PRO-001 | Le statut global doit être omis, pas envoyé comme valeur métier | La valeur vide est omise par `pageParams`; le backend traite `status=''` comme absence de filtre. |
