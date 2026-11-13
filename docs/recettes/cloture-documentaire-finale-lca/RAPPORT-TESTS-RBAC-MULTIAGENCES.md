# Tests RBAC et multi-agences

- Requête sans jeton sur inventaire : 401.
- Super-administrateur fictif, agence active 1 : documents de l’agence 1 accessibles.
- Même session basculée sur agence 9002 : client agence 1 renvoie 404.
- Les routes utilisent `requireAgencyPermission`; les domaines OWN vérifient le propriétaire.
- Les mouvements véhicules acceptent uniquement agence source, destination ou agence courante du véhicule.
- Comptabilité et rapprochements réutilisent leurs services de détail et leurs scopes existants.

- Les actions UI reposent sur les permissions dynamiques (`can(...)`) et non sur des noms de rôles historiques; les suites frontend RBAC et documentaires sont réussies.
- Les endpoints de reprise GED réutilisent les permissions métier de finalisation et les scopes d’agence existants.

Résultat : isolation anonyme, RBAC dynamique et cloisonnement multi-agences validés sur le périmètre documentaire.
