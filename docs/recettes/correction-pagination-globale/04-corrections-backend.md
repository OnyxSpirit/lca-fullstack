# Corrections backend

Le contrat des factures fournisseur est désormais réellement paginé : `COUNT(*)`, `LIMIT`, `OFFSET` et réponse `{items,total,page,pageSize,totalPages}`. La valeur par défaut est 10.

Les valeurs par défaut des services comptables concernés ont été ramenées à 10. Les paramètres de page et de taille restent transmis aux requêtes existantes, sans altérer les prédicats d'agence, concession ou permission.

Les autres listes déjà paginées côté serveur conservent leur contrat afin d'éviter une rupture de compatibilité. Les petites sous-collections sont paginées côté client lorsque l'API renvoie volontairement une ressource de détail complète.
