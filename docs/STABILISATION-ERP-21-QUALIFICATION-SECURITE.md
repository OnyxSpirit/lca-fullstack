# STABILISATION-ERP-21 Phase 3 — Qualification de sécurité

Date : 12 octobre 2026

Version proposée : `ERP-LCA-v1.0.0-rc1`

Verdict technique : **EXPORT SOURCE QUALIFIÉ SOUS RÉSERVES**

Autorisation de distribution : **BLOQUÉE**

## 1. État Git initial

- Branche : `main` ; référence source : `5f9c25c` (`STABILISATION-ERP-20`).
- Index hérité de la phase 2 : 946 suppressions, 4 documents ajoutés, 1 `.gitignore` modifié.
- Total initial : 951 fichiers, 547 insertions et 60 640 suppressions.
- `git diff --check` et `git diff --cached --check` réussis.
- Aucun commit, tag, push ou changement d'historique.

## 2. Suppressions indexées

Les 946 retraits sont toujours présents. L'index ne suit plus :

- `frontend/src/services/accesDemo.txt` ;
- `ll/`, y compris `ll/lca-v1.zip` ;
- `backend-node/dist/` ;
- `tmp/` ;
- `frontend/bun.lock`.

Au début de la phase 3, les retraits indexés issus de la phase 2 étaient intacts. Le contrôle physique final constate que `ll/`, encore présent à la clôture de la phase 2, n'existe plus dans le workspace. ERP-21 Phase 3 n'a exécuté aucune commande de suppression, nettoyage ou restauration et ne tente pas de reconstruire cette archive sensible. Les autres témoins locaux contrôlés (`accesDemo.txt`, `frontend/bun.lock`, `backend-node/dist/server.js`, `tmp/erp19-runtime.mjs`) sont présents et ignorés. L'absence locale de `ll/` ne purge pas ses blobs de l'historique Git.

## 3. Contrôle des secrets et identifiants

Six empreintes d'accès ont été dérivées localement du fichier retiré, sans afficher leurs valeurs. Résultats :

- aucune correspondance dans les fichiers restant suivis ;
- aucune correspondance dans les 786 fichiers exportés ;
- aucune clé privée, clé d'accès cloud ou jeton haute confiance détecté dans l'export ;
- les occurrences génériques `password`, `token` et `secret` restantes correspondent à du code de gestion, des noms de variables ou des fixtures de tests ;
- `.env.example` est inclus comme modèle requis, avec valeurs de remplacement, jamais comme secret opérationnel.

Aucun scan ne garantit mathématiquement l'absence de tout secret inconnu. Le contrôle couvre les empreintes connues, les formats haute confiance, les noms de chemins, les archives et l'inventaire binaire.

## 4. État de rotation des accès

Aucune preuve opérationnelle de révocation ou rotation n'est disponible. Les mentions trouvées dans les rapports ERP-21 décrivent des actions à accomplir, pas leur exécution.

| Groupe | Catégorie déduite | Environnement | Authentification | Statut |
|---|---|---|---|---|
| Empreintes 1 à 6 | comptes de démonstration ou profils métier | impossible à établir avec certitude sans tester les accès | application ERP, identifiant et mot de passe | **À traiter / vérification impossible** |

L'absence de preuve n'est pas assimilée à une rotation. Aucun login n'a été tenté et aucun compte ou mot de passe n'a été modifié.

### Checklist opérationnelle de rotation

1. Identifier pour chaque empreinte l'environnement et le propriétaire du compte.
2. Désactiver les comptes sans utilité légitime.
3. Renouveler le mot de passe des comptes conservés avec une valeur issue du coffre NOVA.
4. Révoquer les refresh tokens/sessions actifs.
5. Vérifier l'échec de l'ancien accès sans consigner sa valeur.
6. Vérifier le nouvel accès par un canal séparé et habilité.
7. Enregistrer uniquement statut, date, environnement et responsable.
8. Obtenir une validation à deux personnes avant de lever le blocage de distribution.

Statuts autorisés par accès : `Rotation confirmée`, `Révocation confirmée`, `À traiter`, `Vérification impossible`. À la date du rapport, aucun accès n'est au statut confirmé.

## 5. Historique Git sensible

Les chemins sensibles existent toujours dans les commits antérieurs. La mission interdit `filter-repo`, BFG et toute réécriture ; aucune purge n'a donc été réalisée.

Conséquences :

- un clone, miroir, bundle ou accès au dépôt complet peut récupérer les anciens blobs ;
- un nouveau commit supprimant les chemins ne les efface pas des parents ;
- `.gitignore` empêche une réintroduction accidentelle, pas l'accès historique ;
- la rotation reste indispensable même si seul l'arbre assaini est remis.

La stratégie retenue exclut complètement `.git` de l'artefact source.

## 6. Stratégie d'export

`git archive HEAD` est explicitement écarté car `HEAD` précède les suppressions préparées. L'export est construit depuis l'index assaini avec une **liste blanche**, dans `/tmp/erp21-rc1-export.6D532o/source`, hors dépôt.

Familles incluses :

- sources, tests et configurations backend/frontend ;
- `package.json` et `package-lock.json` npm ;
- TypeScript, Vite, Dockerfiles, Nginx et Compose production ;
- baseline, seed, migrations et documentation DB ;
- scripts de sauvegarde/restauration ;
- `.env.example`, README, déploiement et documents ERP-20/21 indispensables.

Les scripts historiques de recette, `docker-compose.recette.yml`, anciens rapports non requis et `GUIDE_XAMPP.md` ne sont pas nécessaires à l'installation de production et ne sont pas inclus.

## 7. Exclusions contrôlées

- `.git` et historique Git ;
- fichiers `.env` réels et secrets ;
- fichier d'accès de démonstration ;
- `ll/` et toute archive historique ;
- GED, uploads, bases, dumps et sauvegardes ;
- `node_modules`, builds `dist`, logs, caches et `tmp` ;
- lock Bun et scripts de preuve historiques ;
- configuration Compose propre à la recette.

## 8. Résultat du scan de l'export

- Fichiers : **786** ; liens symboliques : **0**.
- Taille non compressée : environ **6,0 Mio**.
- Interdits nominaux : aucun ; `.env.example` est l'unique modèle d'environnement attendu.
- Empreintes d'accès connues : **0 correspondance**.
- Secrets haute confiance : **0 correspondance**.
- Archives/dumps/clés : **0**.
- Binaires : cinq PNG attendus — deux icônes et trois copies de logos applicatifs.
- La liste de l'archive a été rescannée après création, sans chemin interdit.

## 9. Reproductibilité

L'export contient les deux manifests npm et locks v3, configurations TypeScript/Vite, Dockerfiles, Nginx, sources, tests, migrations 034–079, baseline, seed et procédures d'exploitation. Les builds et tests de phase 2 sont verts : backend/frontend lint et build, backend ciblé 5/5 fichiers, frontend ciblé 33/33 tests.

Une seconde génération en flux avec les mêmes paramètres reproductibles produit exactement la même empreinte SHA-256. Les paramètres fixent ordre, date, propriétaire/groupe numériques et en-tête gzip sans horodatage.

## 10. Archive créée

- Archive : `/tmp/erp21-rc1-export.6D532o/ERP-LCA-v1.0.0-rc1-source.tar.gz`
- Manifeste : `/tmp/erp21-rc1-export.6D532o/ERP-LCA-v1.0.0-rc1-source.MANIFEST.txt`
- Taille : **1 709 384 octets**.
- Fichiers : **786** — 875 entrées tar avec répertoires.
- SHA-256 : `c18616d603d0067e1c43b3dc813897b122dc53113b5010be749875e97f55a773`

SHA-256 est une empreinte d'intégrité, pas une signature ni une preuve d'identité. Aucune clé privée n'a été utilisée. L'archive n'a pas été distribuée.

## 11. Réserves restantes

1. Rotation/révocation des six accès non confirmée : distribution bloquée.
2. Historique Git sensible intact : ne jamais transmettre un clone/bundle/mirror en l'état.
3. Diff assaini non commité et non tagué : revue propriétaire requise.
4. Archive non signée numériquement.
5. Restore drill ERP-22, SCA/CVE connecté et recette NOVA non exécutés.
6. Réserves ERP-20 : périmètre mono-concession, fenêtre rare d'orphelin GED, dérive Compose recette.
7. Disparition physique de `ll/` constatée entre les contrôles Phase 2 et Phase 3, sans action de suppression exécutée par cette phase ; à rapprocher des actions du propriétaire si une conservation locale était attendue.

## 12. Actions avant livraison

1. Compléter et faire approuver la checklist de rotation.
2. Revoir les 946 suppressions et les documents, puis créer le commit/tag par le propriétaire.
3. Reconstruire l'export depuis l'index ou tag nettoyé ; ne pas réutiliser aveuglément cette archive préparatoire si le contenu change.
4. Recalculer SHA-256 et, si requis, signer avec une identité autorisée.
5. Remettre uniquement l'archive assainie et son manifeste, jamais le dépôt Git historique.
6. Réaliser ERP-22 dans un environnement isolé avant validation production.

## 13. Verdict final

### Qualification technique

**EXPORT SOURCE QUALIFIÉ SOUS RÉSERVES.**

L'archive est propre au regard des contrôles exécutés, reproductible et ne contient pas les données/accès connus ni l'historique Git.

### Sécurité opérationnelle

**Rotation non confirmée. Distribution bloquée.**

### Historique Git

**Non distribuable en l'état.** L'export sans `.git` est précisément la mesure de confinement retenue.

### Production

**Non validée.** ERP-21 ne déploie rien et n'attribue aucune autorisation de production.
