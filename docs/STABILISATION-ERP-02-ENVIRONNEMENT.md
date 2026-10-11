# STABILISATION-ERP-02 — Environnement

## Architecture réellement déployée

Projet Compose `lca-recette`, indépendant du projet historique :

| Service | Conteneur | Port hôte | Réseau | Persistance |
|---|---|---:|---|---|
| Frontend | `lca-recette-frontend-1` | `127.0.0.1:4176` | privé + hôte | image reconstruite |
| Backend | `lca-recette-backend-1` | `127.0.0.1:3004` | privé + hôte | uploads/GED dédiés |
| MySQL 8.4.11 | `lca-recette-mysql-1` | `127.0.0.1:33321` | privé + hôte | `lca_recette_mysql_data` |

Volumes dédiés : `lca_recette_mysql_data`, `lca_recette_uploads_data`, `lca_recette_ged_data`. Le réseau `recette_private` reste interne ; `recette_host` rend seulement les ports explicitement liés à `127.0.0.1` accessibles à l'hôte. Aucun volume, secret ou réseau du projet existant n'est partagé.

## Bootstrap et contrôles

Les images ont été reconstruites depuis les sources courantes. Le backend exécute `node dist/scripts/database-bootstrap.js` avant `node dist/server.js`. Les journaux ont confirmé le baseline puis les migrations 072 à 079 et le niveau final 079. Contrôles MySQL réels : 152 tables, 1 162 entrées d'index, 525 contraintes référentielles, 252 permissions actives. Le seed officiel a créé un seul rôle système `SUPER_ADMIN`.

Disponibilité mesurée : `/api/health` HTTP 200 en 175,93 ms au premier contrôle ; frontend HTTP 200 en 8,19 ms. Connexion réelle et pages React validées dans un navigateur.

## Reproduction et conservation

Les variables sont dans `.env.recette`, ignoré par Git et non documenté en clair. Démarrage reproductible : `docker compose --env-file .env.recette -f docker-compose.recette.yml up -d --build`, puis profil outil `seed-admin`. L'environnement et ses données sont laissés actifs.

Sauvegarde ciblée : exécuter `mysqldump` dans `lca-recette-mysql-1`, avec les identifiants injectés par l'environnement du conteneur, vers un fichier daté hors volume. Sauvegarder séparément les volumes uploads/GED. Restauration : arrêter uniquement les trois services `lca-recette`, restaurer uniquement dans `lca_recette_mysql_data`, puis redémarrer et vérifier `/api/health` et `schema_migrations`. Ne jamais viser `lca-mysql-1` ni ses volumes.

## Anomalie d'environnement corrigée

Le réseau exclusivement `internal` empêchait l'exposition effective des ports malgré les bindings Compose. Ajout minimal du réseau `recette_host`, sans modifier l'application. Après recréation des seuls conteneurs de recette, les trois ports sont accessibles localement.

