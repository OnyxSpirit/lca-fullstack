# STABILISATION-ERP-13 — Profils employés

`employee_profiles` porte l’identité RH indépendamment de `users`. `user_id` est facultatif et unique, le rattachement à la concession et à l’agence est persisté, et la suppression logique du lien utilise `SET NULL`.

MySQL réel : 4 profils REC13 conservés à la fin de la campagne, dont le dossier principal lié au compte de test.
