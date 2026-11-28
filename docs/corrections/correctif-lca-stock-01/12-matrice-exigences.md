# Matrice des exigences

| Exigence | Réalisation | État |
|---|---|---|
| Commande simplifiée | Formulaire métier à cinq champs | Conforme |
| Références libres | Recherche/sélection ou ajout explicite marque/modèle | Conforme MySQL/HTTP/navigateur |
| Anti-doublons | Normalisation, unicité existante, reprise après course | Conforme MySQL |
| Atomicité | Références, commande et fiches dans la même transaction | Conforme MySQL |
| N fiches immédiates | Transaction de création | Conforme |
| Réception fiable | Journal de réceptions comme source de vérité | Conforme |
| Historique et navigation | Détail, réceptions, filtre par commande | Conforme |
| Six KPI | Total, physique, commandé, disponible, valeur, dormant | Conforme ciblé |
| Recherche/pagination | Traitement serveur | Conforme ciblé |
| RBAC/agences | Droits dynamiques et agence active | Conforme ciblé |
| Temps réel | Événement limité à l'agence | Conforme ciblé |
| MySQL 8.4 | Migration 138 appliquée | Conforme |
| Recette navigateur | Parcours et création avec références libres capturés ; parcours exhaustif restant | Réserve |
| Non-régression globale | Backend 2 399 sans échec, frontend 1 103 sans échec, intégrations dédiées exécutées | Conforme |
| Temps réel WSS/TLS | Connexion/reconnexion/révocation réussies ; trois sessions A1/A2/B1, propagation agence A et absence de fuite B prouvées | Conforme |
