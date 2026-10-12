# STABILISATION-ERP-21 — Checklist de version candidate

Version proposée : `ERP-LCA-v1.0.0-rc1`

État : **NON PRÊTE À FIGER**

## Contrôles réussis

- [x] Nom de version sans collision avec un tag local existant.
- [x] Worktree initial propre au commit `5f9c25c`.
- [x] `git diff --check` initial réussi.
- [x] Aucun changement SQL, Docker ou dépendance en attente.
- [x] Lint/TypeScript backend réussi.
- [x] Build backend réussi.
- [x] Lint/TypeScript frontend réussi.
- [x] Build frontend réussi.
- [x] Dépendances npm installées cohérentes avec les manifests ; lockfiles npm v3 présents.
- [x] Migrations 034–079 continues, runner ordonné et protégé par verrou/checksum.
- [x] Tests backend ciblés RBAC/Pièces/GED : 5/5 fichiers.
- [x] Tests frontend ciblés SAV/RBAC/Pièces : 33/33.
- [x] RBAC dynamique préservé ; aucune nouvelle dépendance à un rôle métier.
- [x] Six conteneurs historiques/recette healthy, inspection seulement.
- [x] `.env` réels ignorés et non suivis.
- [x] Documentation de déploiement, sauvegarde et restauration existante.
- [x] `accesDemo.txt`, `ll/`, `backend-node/dist/`, `tmp/` et `frontend/bun.lock` retirés de l'index avec conservation physique.
- [x] Règles `.gitignore` ajoutées et vérifiées avec `git check-ignore`.
- [x] Aucun des six fingerprints d'accès connus dans les fichiers restant suivis.
- [x] Aucun chemin sensible/généré visé ne reste suivi.
- [x] Non-régression rejouée après assainissement.

## Blocages à lever avant création de la RC

- [ ] **RC21-SEC-01** — révoquer/faire tourner les accès retirés et fournir la confirmation opérationnelle.
- [ ] **RC21-DATA-01** — décider du traitement de l'historique avant remise d'un clone ; privilégier un export de l'arbre assaini si aucune purge autorisée n'est réalisée.
- [x] Vérifier par un nouveau scan qu'aucun fingerprint connu, document GED, upload ou archive sensible ne reste dans l'index courant.
- [x] Retirer du manifeste `backend-node/dist/` et `tmp/`.
- [x] Confirmer npm comme gestionnaire officiel et retirer `frontend/bun.lock` du suivi.
- [ ] Faire relire la suppression/nettoyage par le propriétaire avant tout commit.
- [x] Rejouer lint, builds et tests ciblés sur le contenu nettoyé.
- [ ] Créer ensuite seulement le commit/tag, par le propriétaire.

## Réserves acceptables pour une RC mono-concession

- [ ] Limitation mono-concession écrite et acceptée ; aucune promesse multi-concession avant preuve isolée.
- [ ] Risque rare d'orphelin GED accepté avec supervision et procédure de rapprochement.
- [ ] Dérive Compose MySQL recette documentée ; elle ne doit pas servir de modèle de production.
- [ ] Couverture navigateur exhaustive multi-profils planifiée en préproduction.

## Contrôles non exécutés pendant ERP-21

- [ ] Audit SCA/CVE avec bases de vulnérabilités à jour.
- [ ] Construction Docker depuis un checkout propre de la future RC.
- [ ] Installation neuve sur infrastructure vierge.
- [ ] Migration/restauration sur copie isolée MySQL 8.4.
- [ ] Test de restauration MySQL + GED + uploads.
- [ ] Test de crash brutal GED et réconciliation.
- [ ] Test réel entre deux concessions.
- [ ] Recette navigateur finale NOVA.
- [ ] Test TLS/DNS/SMTP ou intégrations propres à l'infrastructure cible.

## Actions ERP-22 avant production

1. Créer un environnement isolé sous un nom de projet et des volumes nouveaux.
2. Restaurer une sauvegarde complète vérifiée, sans utiliser les volumes `lca_*` ou `lca_recette_*`.
3. Démarrer la candidate nettoyée sur des ports distincts.
4. Vérifier bootstrap/migrations, santé, login, RBAC, stocks, finance, SAV, Pièces, GED et Socket.IO.
5. Exécuter le rapprochement GED en lecture seule.
6. Tester un rollback applicatif et, séparément, une restauration complète.
7. Collecter les preuves, puis statuer sur la validation production.

## Contrôle juste avant tag

```bash
git status --short
git diff --check
git diff --stat
git ls-files | grep -E '(^|/)(\.env|backups|uploads|ged-storage|tmp|dist|ll)(/|$)'
git grep -Il -E 'PRIVATE KEY|password|secret|token'
```

Les résultats doivent être revus humainement : une correspondance n'est pas automatiquement un secret, mais aucun fichier contenant une valeur opérationnelle ou une donnée personnelle ne doit entrer dans la RC.

## Décision

- [ ] VERSION CANDIDATE PRÉPARÉE
- [ ] VERSION CANDIDATE PRÉPARÉE SOUS RÉSERVES
- [x] VERSION CANDIDATE NON PRÊTE

## Phase 3 — export source

- [x] Export construit depuis l'index assaini, jamais depuis `git archive HEAD`.
- [x] Liste blanche de 786 fichiers nécessaires.
- [x] Aucun `.git`, accès de démonstration, `ll/`, `tmp/`, `dist/`, lock Bun, GED, upload, backup ou archive historique.
- [x] Aucun des six fingerprints d'accès dans l'export.
- [x] Aucune clé privée ni jeton haute confiance détecté.
- [x] Binaires limités à cinq logos/icônes PNG attendus.
- [x] Archive déterministe et manifeste SHA-256 produits hors dépôt.
- [ ] Rotation/révocation des accès confirmée par le propriétaire.
- [ ] Autorisation de distribuer l'archive.
- [ ] Signature numérique par une identité autorisée, si requise.

Verdict technique Phase 3 : **EXPORT SOURCE QUALIFIÉ SOUS RÉSERVES**. La distribution reste bloquée jusqu'à confirmation de rotation et validation du propriétaire.
