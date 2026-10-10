# CORR-ERP-02D — Changements

## Backend

- `showroom-test-drive.ts` centralise le verrouillage et les conflits véhicule, commercial, visite et rendez-vous en cours.
- Les deux routes de démarrage utilisent une transaction avec retry borné des deadlocks MySQL.
- L'annulation verrouille les mêmes ressources avant la transition d'état.
- La création d'un rendez-vous CRM refuse un commercial actuellement en essai.
- L'activité de retour conserve distinctement l'auteur authentifié et le commercial affecté.
- `078_test_drive_resource_indexes.sql` ajoute l'index `(advisor_id, status)` sans modifier l'historique.

## Tests

- Nouveau contrat déterministe des conflits de démarrage.
- Nouvelle intégration MySQL 8.4 de concurrence.
- Contrat VALID-ERP-02 actualisé pour vérifier les protections présentes.
- Cinq tests frontend CRM actualisés : pagination serveur, synchronisation des permissions, source des membres CRM et fixtures paginées.
- Le contrôle de continuité des migrations n'est plus figé à 071.

## Compatibilité

La migration 077 est inchangée. La migration 078 ne modifie aucune ligne métier et n'ajoute qu'un index. Les API conservent leurs permissions, scopes et formats de succès ; seuls de nouveaux conflits 409 explicites peuvent apparaître.
