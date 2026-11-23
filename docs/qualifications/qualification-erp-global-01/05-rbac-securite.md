# RBAC et sécurité

## Modèle confirmé

- scopes applicatifs actifs : `OWN` et `AGENCY` uniquement ;
- cachets collectifs : permissions `stamp.view`, `stamp.manage`, `stamp.use`, `stamp.assign_agencies` en `AGENCY` ;
- permissions recalculées depuis l'agence active et ses rôles locaux ;
- partage d'usage sans transfert de propriété ni administration implicite ;
- refus des agences inactives, étrangères à la concession ou non affectées ;
- ressources centrales délégables : permission `AGENCY`, sans dépendance artificielle à `isSuperAdmin` ;
- opérations système : helper distinct et protections du dernier Super Admin conservées.

## Preuves

Les 59 tests ciblés RBAC/paramètres/livraison/2FA/utilisateurs réussissent. B3.2.1 et LOT13 couvrent les refus inter-agences, inter-concessions, faux Super Admin, `OWN` collectif et identifiants connus sans affectation. La migration attribue initialement `stamp.assign_agencies` au seul Super Admin système tout en permettant la délégation dynamique.

## Limites

Aucun pentest de production, scan de dépendances en ligne ou test navigateur authentifié n'a été exécuté. La conformité locale ne préjuge pas des rôles et données réellement configurés en production.
