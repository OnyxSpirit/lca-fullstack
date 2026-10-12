# Manifeste de livraison

## Identification

| Champ | Valeur |
|---|---|
| Projet | ERP / CRM La Congolaise de l'Automobile (LCA) |
| Client final | LCA |
| Intermédiaire contractuel | NOVA |
| Prestataire / sous-traitant | BEROX |
| Identifiant technique du paquet | `LCA-ERP-PKG-20261012` |
| Date de préparation | 12 octobre 2026 |
| Version Git/release | aucune créée ni revendiquée |
| Statut de qualification | B — qualifié avec réserves non bloquantes |
| Statut de distribution | non distribué ; autorisation formelle requise |
| Verdict de préparation | B — paquet prêt avec réserves documentées |
| Nombre total de fichiers livrés | 471, dont le présent manifeste et `SHA256SUMS.txt` |

## Stack et versions principales

- Frontend : React 19, TypeScript, Vite 6, TanStack Query, Socket.IO Client ;
- backend : Node.js 22 Bookworm Slim, Express 5, TypeScript, JWT, Socket.IO ;
- base : MySQL 8.4, version 8.4.11 lors de la qualification ;
- infrastructure : Docker, Docker Compose v2, Nginx 1.27 Alpine ;
- lockfiles npm livrés pour les dépendances exactes de l'application.

## Arborescence

```text
lca-version-finale/
├── application/              # arborescence native d'exécution
│   ├── backend-node/
│   ├── frontend/
│   ├── deploy/
│   ├── scripts/
│   ├── docker-compose.yml
│   └── docker-compose.livraison.yml
├── infrastructure/
│   ├── docker/
│   └── nginx/
├── base-de-donnees/
│   ├── schema/
│   └── migrations/
├── configuration/exemples/
├── documentation/
│   ├── guides/
│   └── references/
├── manifestes/
└── README-LIVRAISON.md
```

## Inventaire synthétique

- backend : 122 fichiers source, assets, package/lockfile, configuration TypeScript et SQL runtime ;
- frontend : 151 fichiers source, 6 ressources publiques, Nginx, package/lockfile et configuration de build ;
- base : baseline 071, seed système, 46 migrations 034–079 et historique legacy 001–033 dans l'arborescence runtime ;
- exploitation : Compose, override par digests, Dockerfiles, Nginx interne et modèle TLS hôte, MySQL config, backup/restore ;
- documentation : 12 guides de livraison, 3 rapports de référence, présent guide et rapport de préparation.

## Prérequis et installation

Consulter d'abord `README-LIVRAISON.md`, puis `documentation/guides/03-PREREQUIS-TECHNIQUES.md`, `04-GUIDE-INSTALLATION.md` et `05-GUIDE-CONFIGURATION.md`. L'installation exige un hôte Linux Docker dédié, une configuration de secrets externe, un DNS/TLS approuvé, des volumes cibles contrôlés et les autorisations sécurité/exploitation/métier.

## Reproductibilité Docker

Le profil de livraison épingle Node, MySQL et Nginx avec les digests d'index OCI vérifiés le 12 octobre 2026. Il s'utilise en surcharge du Compose natif. Les détails et manifests `linux/amd64` contrôlés figurent dans `infrastructure/docker/IMAGES-VERIFIEES.md`. L'utilitaire Alpine des scripts de sauvegarde reste par tag ; le paquet n'inclut ni SBOM ni signature cryptographique d'éditeur.

## Réserves

- AUD-LCA-013 : timeout SQL métier par requête non généralisé ;
- AUD-LCA-014 : buffering mémoire des téléversements GED ;
- AUD-LCA-024 : épinglage Node/MySQL/Nginx appliqué au profil de livraison, mais gouvernance continue des images, SBOM et signature à traiter ;
- TLS/DNS, multi-concession, profils réels et restauration à volumétrie cible à valider ;
- volumes et scripts backup/restore liés aux noms `lca_*` ;
- distribution et production interdites sans approbation formelle.

## Intégrité et exclusions

`SHA256SUMS.txt` couvre tous les fichiers du répertoire sauf lui-même. L'archive possède une empreinte externe adjacente afin d'éviter toute référence circulaire. Sont exclus : `.git`, `.env` actifs, secrets, clés/certificats privés, dumps et sauvegardes réels, logs, caches, `node_modules`, artefacts `dist`, fichiers temporaires, tests et archives historiques. Les tests ne sont pas nécessaires à l'exécution ; leurs résultats sont conservés dans les rapports de qualification livrés.
