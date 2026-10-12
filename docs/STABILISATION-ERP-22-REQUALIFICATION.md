# STABILISATION-ERP-22 Phase 1B — Requalification

Date : 12 octobre 2026

## Verdict

**INSTALLATION QUALIFIÉE SOUS RÉSERVES**

Les deux blocages techniques de Phase 1 sont levés : les audits de production ne signalent plus de vulnérabilité et les suites backend concernées sont vertes. Une installation neuve depuis le nouvel export est reproductible, saine et fonctionnelle.

Les réserves portent sur la restauration, la distribution et la production, pas sur la reproductibilité technique de l'installation RC2.

## 1. Nouvel export assaini

| Élément | Valeur |
|---|---|
| Version candidate | `ERP-LCA-v1.0.0-rc2` |
| Archive | `/tmp/erp22-rc2-export.KnQSgX/ERP-LCA-v1.0.0-rc2-source.tar.gz` |
| Manifeste | `/tmp/erp22-rc2-export.KnQSgX/ERP-LCA-v1.0.0-rc2-source.MANIFEST.txt` |
| SHA-256 | `31e3f8cd13a8826c1eca756e16674e6830b17b8f063c548ac6d05d9ea8b177a6` |
| Taille | 1 716 119 octets |
| Fichiers | 786 |
| Liens symboliques | 0 |

L'archive RC1 reste inchangée. RC2 réutilise strictement sa liste blanche, chaque fichier étant recopié depuis le projet principal corrigé. Une seconde génération déterministe a produit une archive octet pour octet identique et la même empreinte.

Contrôles d'assainissement RC2 :

- aucun `.git`, historique Git, `node_modules`, build `dist`, `tmp`, `ll`, lock Bun ou fichier d'accès ;
- aucun volume/dossier GED, upload, backup, dump ou archive historique ;
- aucune des six empreintes d'accès connues ;
- aucune clé privée ni jeton haute confiance détecté ;
- package manifests, locks, sources, tests, migrations et fichiers Docker présents.

## 2. Vérifications depuis l'archive extraite

Extraction fraîche : `/tmp/lca-requalification.oBKrV5/source`.

- `npm ci` backend : réussi, 0 vulnérabilité signalée ;
- `npm ci` frontend : réussi, 0 vulnérabilité signalée ;
- lint et build backend : réussis ;
- lint et build frontend : réussis ;
- suites backend anciennement bloquantes : 34/34 ;
- douze suites frontend ciblées : 12/12 fichiers.

Ces contrôles utilisent exclusivement RC2 extraite, jamais les `node_modules` ou les builds du workspace principal.

## 3. Installation Docker isolée

Projet : `lca-requalification`.

| Service | Port hôte | État final |
|---|---:|---|
| frontend | `127.0.0.1:4401` | healthy, 0 redémarrage |
| backend | `127.0.0.1:4402` | healthy, 0 redémarrage |
| MySQL 8.4 | `127.0.0.1:44306` | healthy, 0 redémarrage |

Ressources dédiées :

- réseaux `lca-requalification_requalification_private` et `lca-requalification_requalification_host` ;
- volumes `lca_requalification_mysql_data`, `lca_requalification_uploads_data` et `lca_requalification_ged_data` ;
- secrets temporaires nouveaux, non affichés, fichier de configuration mode 0600 ;
- aucun service externe réel activé.

Images :

- backend, manifeste `sha256:55c754c6e4c08e8e3d470d8130ba0a3d2fac4c03f06d72af36f9c901683f8f57` ;
- frontend, manifeste `sha256:569ed5394c46737b0fafac3643abcb044fb61bdc9d3c9a69eb196ff1b33bb539`.

## 4. Base et parcours runtime

MySQL 8.4.11 a initialisé une base vide :

- baseline 71 et migrations 72 à 79, 9 entrées et niveau maximal 79 ;
- 152 tables ;
- aucune erreur SQL ou de migration ;
- Super Admin temporaire créé ;
- avant les tests RBAC, rôle système de référence unique.

Résultats runtime :

- Auth/JWT/RBAC/Socket.IO : 26/26 ;
- GED/upload : 7/7 ;
- création d'un rôle dynamique et scope `AGENCY` ;
- utilisateur dynamique, accès autorisé et refus 403 vérifiés ;
- rotation/révocation de refresh token et déconnexion vérifiées ;
- refus d'utilisateur désactivé et protection du dernier Super Admin ;
- Socket.IO valide accepté et token invalide refusé ;
- deux PDF synthétiques stockés, métadonnées et empreintes SQL présentes, prévisualisation authentifiée réussie.

Les journaux backend/frontend ne montrent aucune erreur. MySQL émet seulement ses avertissements standards d'initialisation, certificat autosigné et emplacement PID dans cet environnement local.

## 5. Sécurité des dépendances

État initial : 1 critique et 4 élevées au total.  
État RC2 : **0 critique, 0 élevée, 0 modérée, 0 faible signalée** par les deux audits production connectés.

Risque résiduel : un audit SCA est une photographie de la base d'avis au moment de l'exécution. Il ne couvre pas les vulnérabilités encore inconnues, les erreurs de configuration de l'infrastructure cible ou les composants externes. Les parcours réellement affectés — rate limiting, proxy IP, Auth et Socket.IO — ont toutefois été inclus dans la non-régression.

## 6. Environnements protégés

Les neuf conteneurs antérieurs sont restés sains et conservent leurs identifiants :

- `lca` : `4a51ed2e0913`, `8ba5b4b9792a`, `9b37c86b3190` ;
- `lca-recette` : `288107bcdb0f`, `c80eae9753b5`, `5e7de0bab86f` ;
- `lca-qualification` Phase 1 : `dc89e4304bbf`, `c1e22fc742df`, `0007a9965dc7`.

Aucun de leurs conteneurs, volumes, réseaux, ports ou jeux de données n'a été reconstruit, redémarré ou modifié. Le projet `lca-requalification` reste actif pour revue. Aucun `down` ni nettoyage de volume n'a été exécuté.

## 7. Décisions distinctes

| Objet | Décision |
|---|---|
| Qualification technique de l'installation RC2 | **Qualifiée** |
| Sécurité des dépendances | **Blocages connus levés ; audits à zéro au 12 octobre 2026** |
| Verdict global ERP-22 Phase 1B | **INSTALLATION QUALIFIÉE SOUS RÉSERVES** |
| Restauration complète | Non qualifiée, réservée à ERP-22 Phase 2 |
| Distribution | Bloquée jusqu'à preuve de rotation/révocation des anciens accès exposés |
| Transmission du dépôt Git | Interdite en l'état à cause de l'historique sensible |
| Production | Non autorisée par cette mission |

SHA-256 fournit une preuve d'intégrité, pas une signature d'identité. RC2 n'est pas signée numériquement et ne doit pas être distribuée avant levée formelle des réserves opérationnelles.

