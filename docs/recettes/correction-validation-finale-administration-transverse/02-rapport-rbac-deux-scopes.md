# 02 — Rapport RBAC deux scopes

La politique d’attribution et l’API n’acceptent que `OWN` et `AGENCY`. `CONCESSION` et `GLOBAL` sont refusés par validation et par le type SQL final. Les branches historiques restent lisibles dans certains modules pour compatibilité de code, mais les contextes agence normalisent toute donnée historique à `AGENCY` et la base ne peut plus la persister.

La migration 131 archive chaque décision, réduit les anciennes portées larges à `AGENCY` et met en quarantaine les attributions `NULL`. La migration 132 supprime toute valeur ENUM invalide et ajoute un `CHECK`. Le Super Administrateur repose sur `roles.is_system` et son code protégé ; ses opérations métier restent liées à l’agence active.
