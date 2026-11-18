# RBAC et multi-agences

Les corrections n'ajoutent aucune permission et ne déplacent aucune garde métier dans le composant partagé. Les hooks continuent de recevoir l'agence active et leurs paramètres de permission d'origine.

Contrôles statiques effectués :

- aucune requête dans `ServerPagination` ;
- aucune dépendance au magasin d'authentification ;
- affichage des listes toujours conditionné par les permissions existantes ;
- paramètres `agencyId`, filtres et clés React Query conservés lors des changements de page ;
- changement de taille limité à `pageSize` et remise à la première page.

La suite globale contient des scénarios RBAC historiques ; ses échecs de correspondance textuelle CRM sont détaillés dans le rapport de non-régression.
