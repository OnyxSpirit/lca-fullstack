# 11 — Rapport préparation production

Ordre proposé : sauvegarde MySQL vérifiée ; déploiement applicatif en recette ; migrations 131 puis 132 ; contrôle des étapes ; vérification `scope` et absence de valeurs hors `OWN/AGENCY` ; smoke tests authentification/2FA/agence ; quatre intégrations ; recette navigateur ; puis décision GO.

Contrôles post-migration : type ENUM, contrainte CHECK, contenu de l’historique, aucun scope invalide, vrai rôle système unique, sélection d’agence et salles Socket.IO. Retour arrière : arrêter les écritures, restaurer la sauvegarde cohérente et l’ancienne version applicative ensemble.
