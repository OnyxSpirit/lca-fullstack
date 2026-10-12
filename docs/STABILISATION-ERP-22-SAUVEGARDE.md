# STABILISATION-ERP-22 Phase 2 — Sauvegarde

Date : 12 octobre 2026  
Source : environnement fictif `lca-requalification`  
Version : `ERP-LCA-v1.0.0-rc2`

## Résultat

La sauvegarde cohérente de MySQL, de la GED et des uploads a été exécutée avec succès. Elle ne contient ni donnée réelle ni secret d'infrastructure.

## 1. Référence RC2 contrôlée

| Élément | Valeur constatée |
|---|---|
| Archive source | `/tmp/erp22-rc2-export.KnQSgX/ERP-LCA-v1.0.0-rc2-source.tar.gz` |
| SHA-256 | `31e3f8cd13a8826c1eca756e16674e6830b17b8f063c548ac6d05d9ea8b177a6` |
| Fichiers réguliers | 786 |
| Liens symboliques | 0 |
| Manifeste | `/tmp/erp22-rc2-export.KnQSgX/ERP-LCA-v1.0.0-rc2-source.MANIFEST.txt` |

L'empreinte et le nombre de fichiers correspondent exactement à la mission. Aucune archive de substitution n'a été utilisée.

## 2. Jeu de qualification

Le jeu est exclusivement fictif. Il relie deux agences d'une même concession, deux utilisateurs, deux rôles dont `ERP22_CUSTOMER_READER`, 253 affectations de permissions, un client, un prospect, un véhicule, une vente et sa ligne, une facture et sa ligne, un encaissement fictif, un ordre de réparation, une pièce, son stock, un mouvement et une réservation.

Éléments de cohérence métier capturés :

- vente `ERP22-SALE-001` : total 11 800 000 XAF, acompte 5 000 000 XAF, solde 6 800 000 XAF ;
- facture `ERP22-INV-001` : total 11 800 000 XAF, payé 5 000 000 XAF, solde 6 800 000 XAF, statut `partially_paid` ;
- encaissement `ERP22-PAY-001` : 5 000 000 XAF, sans paiement réel ;
- OR `ERP22-OR-001` : statut `in_progress` ;
- pièce `ERP22-PART-001` : stock 10, réservation 2, statut `reserved` ;
- deux documents PDF GED fictifs avec la même empreinte contrôlée ;
- un upload texte fictif `erp22-phase2-upload.txt` ;
- un paramètre applicatif fictif de qualification.

Le rôle dynamique possède `customers.view` au scope `AGENCY` et son affectation utilisateur est présente. Aucun rôle métier n'a été ajouté au code.

## 3. Méthode réellement exécutée

Les services `backend` et `frontend` de la seule source `lca-requalification` ont été arrêtés pendant toute la capture. MySQL est resté actif pour produire un dump `--single-transaction` incluant routines, triggers et événements. Les volumes GED et uploads ont été archivés en lecture seule avant la reprise applicative.

Ordre exécuté :

1. contrôle de l'archive RC2 et inventaire des ressources ;
2. création transactionnelle du jeu fictif ;
3. arrêt de `lca-requalification-backend-1` et `lca-requalification-frontend-1` ;
4. `mysqldump --single-transaction --routines --triggers --events --no-tablespaces --set-gtid-purged=OFF` ;
5. archivage en lecture seule de `lca_requalification_ged_data` et `lca_requalification_uploads_data` ;
6. production des inventaires SHA-256 par fichier ;
7. capture des agrégats SQL de référence ;
8. redémarrage des deux services et validation `healthy`.

Cette coupure applicative empêche les écritures concurrentes entre le snapshot SQL et les fichiers. Elle est adaptée à la qualification ; en production, une fenêtre de maintenance, un mode lecture seule applicatif robuste ou une orchestration de snapshot équivalente est indispensable.

## 4. Contenu et intégrité

Répertoire : `/tmp/erp22-phase2-backup`

| Fichier | Taille | SHA-256 |
|---|---:|---|
| `mysql.sql` | 391 934 octets | `7422d200d0c802e4e5c456dc5789259cb0890f9e73273517ee5c9a6d9720646b` |
| `ged.tar.gz` | 311 octets | `6f82e0f68446cfcc6fcdc7269de7e5e16a3b317531f15f806191ffb216b66915` |
| `uploads.tar.gz` | 300 octets | `d720227d93ed9328a83c8622a319565d57f1ea43ade0373cdaa64bfaccb2d422` |

Taille totale du répertoire de sauvegarde : 413 941 octets. Les volumes sources occupaient 16 522 octets pour la GED et 12 422 octets pour les uploads, répertoires compris. La sauvegarde contient aussi `SHA256SUMS`, les inventaires de fichiers, le résumé SQL, le manifeste RC2, le Compose sans secret, `.env.example` et la requête de comparaison.

Tous les contrôles `sha256sum -c SHA256SUMS` sont réussis. Le dump contient les 152 tables, 9 migrations jusqu'à la version 79 et un marqueur de fin de dump. Les deux archives ont des chemins relatifs sûrs. Deux fichiers GED sont associés aux deux lignes SQL ; aucun fichier GED manquant ou orphelin n'a été détecté.

## 5. Mesures

| Mesure | Durée |
|---|---:|
| Arrêt des services applicatifs | 15 s |
| Capture jusqu'à la fin des archives et contrôles | 36 s |
| Commande de redémarrage | 12 s |
| Interruption applicative totale mesurée | 48 s |

Ces valeurs portent uniquement sur un jeu de qualification minuscule et ne doivent pas être extrapolées à la production.

## 6. Procédure reproductible

Préconditions : archive RC2 vérifiée, espace disque contrôlé, noms de projet/volumes résolus explicitement, fenêtre sans écriture, sauvegarde chiffrée au repos sur une cible réelle, secrets fournis hors archive.

Commandes de principe effectivement validées, avec variables à résoudre explicitement :

```bash
docker compose -p SOURCE --env-file ENV -f COMPOSE stop backend frontend
docker exec SOURCE_MYSQL sh -lc 'MYSQL_PWD="$MYSQL_PASSWORD" mysqldump -u"$MYSQL_USER" --single-transaction --routines --triggers --events --no-tablespaces --set-gtid-purged=OFF "$MYSQL_DATABASE"' > BACKUP/mysql.sql
docker run --rm -v SOURCE_UPLOADS:/data:ro -v BACKUP:/backup alpine:3.21 tar -C /data -czf /backup/uploads.tar.gz .
docker run --rm -v SOURCE_GED:/data:ro -v BACKUP:/backup alpine:3.21 tar -C /data -czf /backup/ged.tar.gz .
sha256sum BACKUP/mysql.sql BACKUP/uploads.tar.gz BACKUP/ged.tar.gz > BACKUP/SHA256SUMS
docker compose -p SOURCE --env-file ENV -f COMPOSE start backend frontend
```

Il faut ensuite vérifier le marqueur de fin du dump, lister les archives, comparer les inventaires SQL/fichiers, contrôler les empreintes et la santé source. Une commande terminée sans erreur n'est pas une validation suffisante.

## 7. Limites et risques

- Les scripts historiques `scripts/backup.sh` et `scripts/restore.sh` ciblent des noms de volumes `lca_*` codés en dur et le Compose par défaut. Ils n'ont pas été utilisés pour cette restauration multi-environnement.
- La sauvegarde de qualification est temporaire, locale, non chiffrée et non signée ; elle ne constitue pas un dispositif de sauvegarde de production.
- Le fichier `.env.restauration` et les secrets générés ne font pas partie de la sauvegarde.
- Il faut tester régulièrement la restauration ; l'existence d'un dump ne prouve pas sa restaurabilité.
- Les six accès historiquement exposés restent à révoquer ou renouveler.

