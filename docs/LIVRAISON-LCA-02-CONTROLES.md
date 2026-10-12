# LIVRAISON-LCA-02 — Contrôles de préqualification

Date : 12 octobre 2026  
Version : `ERP-LCA-v1.0.0-rc2`  
Destinataire : La Congolaise de l'Automobile (LCA)  
Prestataire : BEROX

## 1. Dossier documentaire

Les douze documents de `docs/livraison-lca/` ont été relus. Le destinataire, le prestataire, la version, le périmètre mono-concession/multi-agences, l'architecture, les procédures, les résultats de recette et les exclusions sont cohérents.

Deux corrections démontrées ont été appliquées :

- le guide d'installation précise que le Compose actuel exige encore `ADMIN_PASSWORD` à la résolution et qu'une suppression simple ferait échouer `docker compose config` ;
- le registre des réserves explicite désormais preuve attendue, condition de clôture et caractère bloquant pour distribution/production.

Les liens locaux des documents créés ou actualisés ont été résolus sur disque. Le modèle de procès-verbal identifie BEROX et la LCA, laisse les représentants/date/lieu/signatures/cachets vides et ne présume aucune remise.

## 2. Archive RC2

| Contrôle | Résultat |
|---|---|
| Existence | présente au chemin de référence |
| SHA-256 | `31e3f8cd13a8826c1eca756e16674e6830b17b8f063c548ac6d05d9ea8b177a6` conforme |
| Taille | 1 716 119 octets |
| Fichiers réguliers | 786 |
| Liens symboliques | 0 |
| Chemins absolus ou `..` | 0 |
| `.git` / historique | absent |
| `.env` réel | absent ; seul `.env.example` est attendu |
| `node_modules`, `dist`, `tmp`, `ll` | absents |
| GED, uploads, backups, dumps | absents |
| Archives imbriquées | 0 |
| PDF ou base de données embarquée | 0 |
| Motifs de secrets haute confiance | 0 fichier |

Le contenu binaire est limité à cinq PNG applicatifs déjà répertoriés. L'absence de donnée réelle est étayée par la liste blanche, l'absence de répertoires de données, de PDF, de dumps et d'archives ; aucun scan ne constitue une garantie mathématique contre une donnée inconnue.

## 3. Manifeste RC2

Le manifeste externe correspond au nom, à la taille, au nombre de fichiers et à l'empreinte de l'archive. Sa mention historique « restauration réservée à ERP-22 Phase 2 » décrit l'état au moment de sa génération ; elle est désormais complétée, sans altération du manifeste, par la qualification de restauration ERP-22. Le manifeste maintient correctement la distribution non autorisée.

## 4. Cohérence application/documentation

- React 19, Vite 6, TypeScript ; Node.js 22, Express 5 ; Nginx 1.27 ; MySQL 8.4 ; Socket.IO 4.8 ;
- baseline 071 puis migrations 072–079 ;
- Compose avec réseaux public/interne et volumes `lca_mysql_data`, `lca_uploads_data`, `lca_ged_data` ;
- JWT accès/refresh avec session persistée ;
- RBAC dynamique `OWN`, `AGENCY`, `CONCESSION`, `GLOBAL` ;
- GED privée via API, uploads limités aux médias exposables ;
- sauvegarde/restauration cohérente MySQL + GED + uploads ;
- scripts historiques liés aux volumes `lca_*`, réserve maintenue.

Différence assumée : le dossier officiel LCA a été créé après l'export RC2. Il accompagne RC2 séparément dans la préparation et n'est pas présenté comme contenu dans l'archive.

## 5. Contrôles reproductibles

Les contrôles utilisent `sha256sum`, `tar -tvzf`, inspection des chemins, extraction isolée, `find`, scan de motifs haute confiance, résolution des liens Markdown et comparaison du manifeste. Aucun test fonctionnel ERP-01 à ERP-22 n'a été relancé et aucune opération Docker n'a été effectuée.

## 6. Résultat

L'intégrité technique et la cohérence documentaire sont satisfaisantes pour une préqualification. La sécurité opérationnelle reste bloquée par l'absence de preuve de rotation/révocation des six accès. Ni distribution ni production ne sont autorisées.

## 7. Paquet préparé

- répertoire local : `/tmp/LCA-ERP-v1.0.0-rc2-PREPARATION` ;
- manifeste global externe : `/tmp/LCA-ERP-v1.0.0-rc2-PREPARATION.MANIFEST-GLOBAL.tsv` ;
- empreinte du manifeste : `/tmp/LCA-ERP-v1.0.0-rc2-PREPARATION.MANIFEST-GLOBAL.tsv.sha256` ;
- contrôle interne : `SHA256SUMS` ;
- inventaire interne : `MANIFEST-PAYLOAD.tsv` ;
- contenu final : 32 fichiers, tous couverts par le manifeste global externe.

Le manifeste global est externe afin de pouvoir couvrir sans auto-référence les fichiers de contrôle internes. Les validations finales ont confirmé les 32 empreintes, les sommes internes, l'absence de lien Markdown cassé et l'empreinte inchangée de l'archive RC2.
