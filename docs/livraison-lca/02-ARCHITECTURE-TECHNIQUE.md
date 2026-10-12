# Architecture technique

## Composants réels

| Couche | Technologie constatée | Rôle |
|---|---|---|
| Interface | React 19, TypeScript 5.8, Vite 6, TanStack Query, Zustand | SPA et état client |
| Reverse proxy | Nginx 1.27 | fichiers statiques, `/api`, `/uploads`, `/socket.io` |
| API | Node.js 22, Express 5, TypeScript 5.9 | logique métier et sécurité |
| Temps réel | Socket.IO 4.8 | notifications et invalidation des vues |
| Données | MySQL 8.4 | données, transactions et migrations |
| Authentification | JWT accès/refresh avec session persistée | connexion et révocation |
| Autorisation | RBAC dynamique | permissions et scopes |
| Documents | volume GED privé + volume uploads | documents contrôlés et médias |
| Déploiement | Docker Engine et Compose | construction et orchestration |

NestJS n'est pas utilisé par l'architecture active. `backend-node/` est l'unique backend.

```text
Utilisateur → HTTPS/proxy hôte éventuel → Nginx Docker → Express → MySQL
                                             │          ↕ Socket.IO
                                             └→ uploads   GED privée via API
```

## Réseau et persistance

Le Compose de production publie uniquement le frontend Nginx. Backend et MySQL sont exposés seulement sur le réseau Docker interne. Trois volumes nommés conservent MySQL, uploads et GED. La topologie des environnements locaux de recette ne doit pas servir de modèle de production.

## Base et bootstrap

Une base vide reçoit la baseline consolidée 071, le seed système, puis les migrations 072–079. Une base existante versionnée reçoit uniquement les migrations absentes. Une base non vide sans `schema_migrations` est refusée. Le runner utilise verrou, checksums et journal d'étapes.

## Sécurité structurante

Le backend est l'autorité des droits. Le frontend masque les actions non autorisées sans remplacer le contrôle serveur. La GED n'est pas servie statiquement. Le backend s'exécute sous l'utilisateur non privilégié `node`. Le rate-limit d'authentification est en mémoire et nécessite un store partagé avant toute horizontalisation.

