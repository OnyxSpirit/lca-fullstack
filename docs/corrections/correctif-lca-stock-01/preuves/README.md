# Index des preuves

Preuves obtenues le 28 novembre 2026 : build/lint backend, lint/build frontend isolé, tests ciblés, test MySQL/HTTP, niveau de migration 138, absence de `FAILED_PARTIAL`, cohérence `quantity_received = JSON_LENGTH(vehicle_ids)`, concurrence 6+6, cloisonnement d'une commande étrangère, et vérification d'immuabilité des migrations.

Les captures navigateur initiales et de reprise sont conservées dans ce dossier. La reprise Chromium du 28 novembre 2026 a notamment produit `recette-stock-commandes-reprise.png`, `recette-nouvelle-commande-reprise.png` et `recette-commande-reprise.png`.

T124 est prouvé par `T124-formulaire-renseigne.png` et `T124-reouverture-apres-annulation.png`. Dans la même exécution, le contrôle direct de la base isolée a retourné zéro marque, zéro modèle, zéro commande et zéro véhicule pour les deux références inédites annulées. Aucun secret ni nom de référence temporaire n'est consigné.

Les sorties détaillées restent dans le journal de la tâche Codex ; aucune sortie n'a été inventée ou assimilée à une couverture qu'elle ne fournit pas. Les autres parcours visuels exhaustifs restent des réserves tant qu'ils ne sont pas exécutés.
