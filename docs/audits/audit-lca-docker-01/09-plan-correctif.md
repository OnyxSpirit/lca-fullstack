# Plan correctif recommandé

Aucune étape ci-dessous n’a été exécutée pendant l’audit.

1. Sauvegarder la base principale et vérifier la restauration sur une instance isolée.
2. Archiver les fichiers exacts de migration ayant produit les checksums enregistrés.
3. Comparer structure et données après chaque étape 135.
4. Concevoir une migration corrective additive : gérer explicitement `fk_invoice_customer`, rendre `customer_id` nullable, ajouter les colonnes tiers, puis terminer les étapes 8–10.
5. Réconcilier le journal uniquement par un outil dédié, audité et testé ; ne jamais modifier arbitrairement les checksums.
6. Figer 135 définitivement et placer toute correction dans un nouveau numéro.
7. Tester 135→correctif→136 sur copie anonymisée représentative, puis installation fraîche.
8. Corriger la baseline 071/094 et ajouter un test CI qui applique baseline puis toutes les migrations.
9. Séparer le job de migration du conteneur serveur. Le serveur ne démarre qu’après succès du job.
10. Ajouter un profil de qualification unique Node 22/MySQL 8.4/Playwright, avec noms de projet et ports calculés.
11. Écrire les sorties dans des volumes ou répertoires appartenant à l’UID appelant.
12. Ajouter CI : checksum immuable des migrations publiées, build, tests, migration fraîche, upgrade historique, healthchecks et test HTTP réel.
13. Après correction seulement, recréer les services selon une procédure approuvée et vérifier backend, frontend, documents et RBAC.

Tests obligatoires : restauration, conservation des lignes, contraintes FK, étapes de migration, idempotence, démarrage sans boucle, endpoint santé, proxy frontend, régression LCA-01/02/03 et contrôle navigateur.

