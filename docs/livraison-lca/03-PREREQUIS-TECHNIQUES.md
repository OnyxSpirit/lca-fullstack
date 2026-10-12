# Prérequis techniques

## Plateforme

- hôte Linux supportant Docker Engine et le plugin Docker Compose v2 ;
- architecture compatible avec les images `node:22-bookworm-slim`, `mysql:8.4` et `nginx:1.27-alpine` ;
- DNS et certificat TLS gérés par l'infrastructure cible ;
- horloge synchronisée ;
- espace disque dimensionné pour images, MySQL, GED, uploads et sauvegardes externalisées ;
- supervision CPU, mémoire, disque, healthchecks, logs, certificats et sauvegardes.

## Capacité minimale constatée dans Compose

Le Compose fixe des plafonds de 1 500 Mio pour MySQL, 768 Mio pour le backend et 128 Mio pour le frontend. Ce ne sont pas des recommandations de dimensionnement production : une mesure sur les volumes et charges LCA reste nécessaire.

## Réseau

- publier normalement 80/443 via Nginx ;
- ne jamais publier MySQL 3306 ni Express 3001 sur Internet ;
- déterminer précisément `TRUST_PROXY_HOPS` ;
- autoriser les WebSockets sur `/socket.io` ;
- définir l'origine publique exacte dans `FRONTEND_URL`.

## Accès et sécurité

- coffre de secrets ou mécanisme équivalent ;
- compte MySQL applicatif non-root ;
- secrets JWT distincts et aléatoires ;
- sauvegardes chiffrées hors hôte ;
- comptes nominatifs et principe du moindre privilège ;
- rotation préalable des accès historiquement exposés.

## Éléments à fournir par la LCA avant installation

Nom de domaine, certificats ou procédure ACME, politique de sauvegarde/rétention, capacité attendue, responsables exploitation/sécurité/métier, fenêtres de maintenance, paramètres d'identité légale et opérationnelle, matrice initiale des habilitations et décision explicite sur le périmètre mono-concession.

