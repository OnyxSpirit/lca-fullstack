# STABILISATION-ERP-13 — Personnel

Création, lecture, modification, recherche, filtres, statut, unicité du matricule et validations de date vérifiés. Une création concurrente avec le même matricule produit exactement un `201` et un `409`.

Le dossier `REC13-EMP-001` est autonome. La liaison, la déliaison puis la reliaison à un compte ERP ont été vérifiées ; délier le dossier ne désactive pas le compte.
