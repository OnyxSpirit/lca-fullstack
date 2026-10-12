# Dossier technique LCA — ERP LCA v1.0.0-rc2

Prestataire : BEROX  
Destinataire : La Congolaise de l'Automobile (LCA)  
Statut : dossier préparatoire, distribution et production non autorisées

## Périmètre

L'ERP/CRM automobile couvre CRM, clients 360°, stock VN/VO, ventes, livraisons, facturation, encaissements, Showroom, SAV/Atelier, pièces, GED, reporting, notifications, trésorerie, RH/administration et RBAC dynamique. La qualification consolidée porte sur une exploitation mono-concession et multi-agences ; l'isolation entre plusieurs concessions n'est pas qualifiée en conditions réelles.

## Architecture et version

- React 19, TypeScript et Vite 6, servis par Nginx 1.27 ;
- Node.js 22, Express 5, JWT et Socket.IO 4.8 ;
- MySQL 8.4 ;
- volumes distincts MySQL, uploads et GED ;
- scopes RBAC `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL`.

La candidate technique `ERP-LCA-v1.0.0-rc2` contient 786 fichiers réguliers, sans historique Git, et porte l'empreinte SHA-256 `31e3f8cd13a8826c1eca756e16674e6830b17b8f063c548ac6d05d9ea8b177a6`.

ERP-22 a qualifié une installation neuve, puis une sauvegarde et une restauration indépendantes de MySQL, GED et uploads. Ces résultats ne valent ni autorisation de distribution ni autorisation de production.

## Installation et exploitation

Les procédures actives sont `README.md`, `DEPLOYMENT.md` et `docs/livraison-lca/`. Une installation neuve utilise `docker-compose.yml`, `.env.example`, une base vide et des secrets nouveaux. Seul Nginx doit être publié ; Express et MySQL restent privés.

La baseline fraîche est 071 et le bootstrap applique les migrations 072–079. Le premier Super Administrateur est créé par `seed-admin`. Les rôles métier sont ensuite créés dynamiquement ; aucun rôle historique n'est obligatoire.

La sauvegarde doit couvrir au même point MySQL, GED et uploads, avec empreintes et manifeste. La procédure ERP-22 est la référence qualifiée ; les scripts historiques à volumes `lca_*` exigent une revue avant usage dans une autre topologie.

## Réserves et remise

- rotation/révocation des six accès historiquement exposés non confirmée ;
- historique Git sensible interdit de remise ;
- isolation multi-concession non qualifiée ;
- risque rare d'orphelin GED après crash brutal ;
- rate-limit en mémoire non adapté au déploiement horizontal sans store partagé ;
- aucune autorisation de production.

La remise prévue à la LCA doit utiliser un export assaini sans `.git`, accompagné du manifeste, de l'empreinte, de la documentation, du registre des réserves et d'un procès-verbal non pré-signé. L'archive RC2 ne doit pas être distribuée avant levée des blocages de sécurité et autorisation formelle.
