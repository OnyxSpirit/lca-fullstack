# Plan de déploiement et retour arrière

Avant déploiement : sauvegarde MySQL vérifiée, variables d'environnement contrôlées, build des deux applications, fenêtre de maintenance et surveillance des migrations 131/132.

Déploiement proposé : appliquer le bootstrap/migrations sur une copie de préproduction, vérifier le niveau 132 et l'absence de scopes interdits, déployer le backend puis le frontend, exécuter les tests de fumée connexion/changement d'agence/Clients.

Retour arrière : arrêter les écritures, restaurer conjointement la version applicative et la sauvegarde cohérente de base. Ne pas tenter de réintroduire manuellement `GLOBAL` ou `CONCESSION`. Ce document est un plan ; aucun déploiement n'a été réalisé.
