# ERP-14 — Multi-concessions

MySQL ne contient qu’une concession. Aucun endpoint public de création de concession ni parcours d’administration sûr n’a été identifié ; `/concessions/current` ne modifie que l’identité courante.

Spécification recommandée avant implémentation : création réservée au Super Administrateur système, identifiant/code uniques, transaction concession+agence initiale, audit obligatoire et confirmation explicite. Réserve BLOQUÉE, aucune création SQL.
