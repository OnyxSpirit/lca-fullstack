# Tests RBAC et multi-agences

- Requête sans jeton sur inventaire : 401.
- Super-administrateur fictif, agence active 1 : documents de l’agence 1 accessibles.
- Même session basculée sur agence 9002 : client agence 1 renvoie 404.
- Les routes utilisent `requireAgencyPermission`; les domaines OWN vérifient le propriétaire.
- Les mouvements véhicules acceptent uniquement agence source, destination ou agence courante du véhicule.
- Comptabilité et rapprochements réutilisent leurs services de détail et leurs scopes existants.

Réserve : la matrice réelle d’un utilisateur non administrateur avec rôles différents dans deux agences n’a pas été exécutée exhaustivement.
