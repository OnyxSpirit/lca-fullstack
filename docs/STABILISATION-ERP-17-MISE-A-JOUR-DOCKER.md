# ERP-17 — Mise à jour contrôlée Docker

Date : 2026-10-11. Projet exclusivement ciblé : `lca-recette`.

## Verdict Docker

**VALIDÉ.** Les images backend et frontend ont été reconstruites, puis leurs conteneurs remplacés séparément avec `--no-deps`. MySQL recette, les trois conteneurs historiques, les volumes, réseaux et ports sont restés inchangés.

## Contrôles préalables

- Branche `main`, HEAD `4fa8cdf7b2eee56c483e5887975c2d0c82f97de6`.
- Compose : `/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml`, SHA-256 `e8cd0174c3bcac284274fb97baa76dd446dbfed69c42baea889b35a10d471972`.
- Environnement : `/home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette`, SHA-256 `289c89872d142122fca0c5ebb522d6b80a297613721266346ba0e8a41d346572`.
- Hashes Compose : backend `35e6d1c17d285757640b99082143fc69bad9cd61d8e9d58a85d80709fcd0476a`, frontend `21ff846ca7e3b7e248e40107f44c62fd077260f71aa61b779fa164ee217448d2`.
- API 3004 et frontend 4176 répondaient HTTP 200.
- Données REC15/REC16 capturées avant opération.

## Sauvegardes

Répertoire protégé en mode utilisateur : `backups/erp17-pre-update-20261011`.

- dump MySQL cohérent `--single-transaction`, 781 593 octets ;
- archive GED, 79 227 octets ;
- archive uploads, 466 octets ;
- archive des deux anciennes images, 120 685 568 octets ;
- copies du Compose et de `.env.recette` ;
- fichier `SHA256SUMS`, toutes les empreintes vérifiées ;
- intégrité intégrale des trois archives et fin normale du dump vérifiées.

Aucune restauration n'a été effectuée. Le retour arrière conserve les volumes et consiste à recharger les anciennes images archivées puis à recréer uniquement backend/frontend avec `--no-deps --no-build`.

## Images et conteneurs

| Service | Image avant | Image après | Conteneur avant | Conteneur après |
|---|---|---|---|---|
| backend recette | `sha256:b6a770eb0090…` | `sha256:286daa621743…` | `f95ed37f5408…` | `6fb9d0de0f19…` |
| frontend recette | `sha256:10437171bfe2…` | `sha256:9a1109c46d92…` | `3825fe4f6c82…` | `e07f20611b41…` |
| MySQL recette | `sha256:b3b90af2a655…` | identique | `5e7de0bab86f…` | identique |

Conteneurs historiques inchangés : frontend `323a78fc5f2b…`, backend `ce40bb9ad897…`, MySQL `9b37c86b3190…`.

## Commandes exécutées

```bash
docker compose -p lca-recette -f /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml --env-file /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette build backend frontend
docker compose -p lca-recette -f /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml --env-file /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette up -d --no-deps backend
docker compose -p lca-recette -f /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/docker-compose.recette.yml --env-file /home/silva/Documents/Codex/2026-08-31/ch/outputs/lca-fullstack/.env.recette up -d --no-deps frontend
```

Le backend a été validé sain avant le remplacement du frontend. Son journal indique `Database VERSIONED; niveau >= 79`, puis l'écoute sur 3001 : aucune migration ou seed inattendu n'a été observé. API et Socket.IO ont répondu HTTP 200.

## Infrastructure finale

- frontend recette : `127.0.0.1:4176 -> 80`, healthy ;
- backend recette : `127.0.0.1:3004 -> 3001`, healthy ;
- MySQL recette : `127.0.0.1:33321 -> 3306`, healthy et ID inchangé ;
- volumes `lca_recette_mysql_data`, `lca_recette_ged_data`, `lca_recette_uploads_data` inchangés ;
- réseaux `lca-recette_recette_private`, `lca-recette_recette_host` et réseau MySQL hérité inchangés ;
- frontend historique sur 3001 et ses deux services associés inchangés et healthy.

## Données préservées

Avant et après : factures par agence A2=12/A3=11 ; OR7 `delivered`, OR8 `invoiced` ; factures 16/19/20/21/22/23 identiques ; créance garantie 2 soldée ; ventes 9/10/11, livraisons 5/6 et stocks pièce 7 identiques ; 46 documents GED. Aucun paiement, stock, facture, OR ou document n'a été créé, modifié ou supprimé par la mise à jour.

## Incidents et anomalies

Aucun incident Docker. Seuls les deux IDs autorisés ont changé. La provenance Compose fusionnée du MySQL reste une dette d'infrastructure indépendante, sans impact sur cette mise à jour ciblée.
