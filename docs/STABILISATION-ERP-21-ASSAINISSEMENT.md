# STABILISATION-ERP-21 Phase 2 — Rapport d'assainissement

Date : 12 octobre 2026

Version proposée : `ERP-LCA-v1.0.0-rc1`

Verdict : **VERSION CANDIDATE NON PRÊTE**

## 1. Périmètre et méthode

L'assainissement a porté exclusivement sur les chemins autorisés par la mission. Chaque dépendance a été recherchée avant modification. Les retraits utilisent `git rm --cached` : ils modifient l'index, mais ne suppriment aucune copie physique. Aucun historique Git n'est réécrit.

## 2. Fichiers retirés du suivi Git

| Chemin | Fichiers retirés | Motif |
|---|---:|---|
| `frontend/src/services/accesDemo.txt` | 1 | identifiants/mots de passe de démonstration, aucune référence applicative |
| `ll/` | 884 | ancienne copie divergente, archive contenant GED/uploads incluse |
| `backend-node/dist/` | 20 | sortie TypeScript reproductible par `npm run build` |
| `tmp/` | 40 | scripts et preuves/rendus temporaires de recette |
| `frontend/bun.lock` | 1 | lock obsolète ; le projet, Docker et la documentation utilisent npm |
| **Total** | **946** | suppressions proposées dans le futur commit |

`ll/lca-v1.zip` est compris dans les 884 fichiers de `ll/`.

## 3. Copies locales conservées

Après retrait de l'index, les chemins suivants existent toujours physiquement :

- `frontend/src/services/accesDemo.txt` ;
- `ll/` et `ll/lca-v1.zip` ;
- `backend-node/dist/` ;
- `tmp/` ;
- `frontend/bun.lock`.

Le contrôle par inode/taille avant et après confirme la conservation. Aucun document GED, upload, PDF, image ou archive n'a été supprimé.

## 4. Règles `.gitignore`

Ajouts racine :

```gitignore
/ll/
/tmp/
/frontend/src/services/accesDemo.txt
/frontend/bun.lock
```

`backend-node/dist/` est déjà couvert par `**/dist/` à la racine et par `backend-node/.gitignore`. `git check-ignore -v` confirme les cinq familles.

## 5. Dépendances et conséquences

- Aucune référence applicative au fichier d'accès ou à `ll/`.
- Les références `/tmp/...` dans les scripts pointent vers le répertoire temporaire système ; un script produit aussi des preuves dans le `tmp/` racine, désormais correctement ignoré.
- Le backend démarre depuis `dist/server.js`, mais Docker et la procédure construisent `dist` depuis `src` avant exécution. Le build post-assainissement le recrée avec succès.
- Aucun script, Dockerfile ou documentation opérationnelle n'utilise Bun. `package-lock.json` reste l'autorité npm.

## 6. Contrôle de sécurité

Résultats sur l'index courant :

- 0 chemin suivi parmi `ll`, `tmp`, `dist`, GED, uploads, backups, archives et `.env` réels ;
- 0 correspondance pour les six fingerprints extraits du fichier d'accès ;
- les correspondances littérales restantes à `password/token/secret` sont des fixtures de tests ou du code de gestion, pas les accès retirés ;
- aucune valeur sensible n'a été imprimée dans les rapports.

Ce résultat qualifie **le futur arbre**, pas l'historique. Les anciens commits contiennent toujours le fichier d'accès, le miroir `ll/`, son archive et les données qu'elle embarque.

## 7. Accès à renouveler

Tous les comptes/accès recensés dans le fichier local retiré doivent être considérés exposés jusqu'à preuve de rotation. ERP-21 ne modifie ni comptes ni mots de passe en base. Le propriétaire doit :

1. identifier l'environnement de chaque accès ;
2. désactiver les comptes inutiles ;
3. renouveler les secrets des comptes conservés ;
4. révoquer les sessions actives ;
5. consigner date, responsable et résultat sans inscrire le nouveau secret dans Git.

## 8. Historique Git sensible

La mission interdit la réécriture d'historique ; aucune purge n'a été exécutée. Un clone ou bundle du dépôt conserve donc l'accès aux anciens blobs. Deux voies sûres restent possibles après rotation :

- remettre à la LCA un export signé de l'arbre du tag nettoyé, sans dossier `.git` ;
- organiser séparément une purge d'historique autorisée, coordonnée avec les détenteurs de clones, puis révoquer les anciennes références.

Un simple `.gitignore` ne protège pas l'historique existant.

## 9. Non-régression après assainissement

| Contrôle | Résultat |
|---|---|
| Backend TypeScript/lint | réussi |
| Backend build | réussi, `dist` recréé localement et ignoré |
| Frontend TypeScript/lint | réussi |
| Frontend build | réussi, 2 488 modules |
| Backend RBAC/Pièces/GED | 5/5 fichiers |
| Frontend SAV/RBAC/Pièces | 33/33 tests |
| Dépendances `npm ls --depth=0` | réussi des deux côtés |

Aucune fonctionnalité ou assertion n'a été modifiée.

## 10. Docker

La phase 2 n'exécute aucune commande de build, restart, up/down ou déploiement Docker. Le contrôle final en lecture seule confirme les six conteneurs `lca` et `lca-recette` `healthy`. Aucun volume, réseau, port ou MySQL n'est modifié.

## 11. État Git préparé

- 946 suppressions de l'index préparées par `git rm --cached` ;
- 1 `.gitignore` modifié ;
- 4 documents ERP-21 ajoutés/modifiés ;
- aucun commit, tag, push, reset, restore, stash ou clean ;
- copies locales des éléments retirés présentes et ignorées.

## 12. Réserves restantes

1. Rotation/révocation non confirmée : blocage de distribution.
2. Historique sensible intact : blocage de remise d'un clone Git à la LCA.
3. Revue propriétaire et commit de nettoyage non réalisés.
4. ERP-22 restauration isolée, SCA/CVE et recette LCA non exécutés à cette étape historique.
5. Réserves ERP-20 : mono-concession, crash GED rare et dérive Compose recette.

## 13. Verdict

**VERSION CANDIDATE NON PRÊTE.**

L'assainissement du contenu candidat est techniquement réussi et la non-régression est verte. Le verdict reste imposé par deux contrôles hors code : absence de confirmation de rotation et accessibilité des données dans l'historique si le dépôt complet est distribué. Après ces décisions opérationnelles et revue du diff, la candidate pourra être requalifiée **PRÉPARÉE SOUS RÉSERVES**.
