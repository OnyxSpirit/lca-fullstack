# Rapport — Évolutions cachets et export CSV financier

Date de qualification : 14 octobre 2026  
Périmètre : code source local et base MySQL 8.4 temporaire isolée  
Déploiement : aucun

## 1. Audit de l’existant

La gestion des cachets reposait déjà sur les entités `service_stamps` et `service_stamp_versions`, le stockage GED privé, les autorisations par rôle, les catégories et les politiques documentaires. L’utilisation documentaire est résolue par `document-mark-policy.service.ts`, qui exige un cachet logique actif et une version active. Les documents finalisés conservent l’identité, la version, l’empreinte et les métadonnées du cachet dans `document_mark_snapshots`; les signatures de livraison référencent également la version employée.

Les permissions dynamiques existantes `stamp.view`, `stamp.manage` et `stamp.use` couvrent le besoin sans créer de droit implicite. `stamp.manage` gouverne la révocation et la suppression. Les scopes AGENCY, CONCESSION et GLOBAL sont appliqués par les prédicats RBAC existants; OWN est explicitement refusé pour une ressource institutionnelle collective. Aucun test sur le nom `SUPER_ADMIN` n’a été introduit.

La section financière réelle retenue pour l’export global est le journal `treasury_movements`. C’est la source normalisée commune aux entrées, sorties, remboursements, règlements, décaissements budgétaires, transferts et contrepassations. Les factures et rapprochements possèdent leurs propres écrans ou exports; le nouvel export ne prétend donc pas constituer un grand livre comptable exhaustif.

## 2. Révocation des cachets

La migration additive `082_stamp_revocation.sql` ajoute à `service_stamps` :

- `revoked_by`, lié à `users` avec suppression restreinte;
- `revoked_at`;
- `revocation_reason`;
- un index territorial et temporel;
- une contrainte garantissant qu’un cachet révoqué est inactif et possède simultanément auteur, date et motif.

L’API `POST /api/document-marks/stamps/:id/revoke` :

- valide un motif obligatoire;
- verrouille le cachet dans une transaction;
- applique le scope de `stamp.manage`;
- désactive le cachet logique et sa version active;
- conserve toutes les versions et références documentaires;
- journalise `stamp.revoked` avec `writeAudit` et un contexte territorial EXPLICIT conforme à la migration 081.

Les gardes interdisent ensuite toute nouvelle version ou réactivation. Les sélecteurs de politiques et les affectations de rôles refusent également un cachet révoqué ou inactif. L’interface demande confirmation, exige le motif et affiche « Révoqué », sa date et son motif.

## 3. Suppression sécurisée

L’API `DELETE /api/document-marks/stamps/:id` exécute dans une même transaction : verrou du cachet et de ses versions, contrôle du scope, puis recherche de dépendances dans :

- `document_mark_snapshots`;
- `delivery_signatures`;
- `document_mark_policies`.

Toute dépendance produit HTTP 409 avec le message : « Ce cachet a déjà été utilisé dans des documents. Il ne peut pas être supprimé. Vous pouvez toutefois le révoquer. » Aucun snapshot, document officiel ou historique opérationnel n’est supprimé. Une suppression autorisée retire seulement un cachet jamais utilisé, ses autorisations de rôle, ses versions et enfin ses fichiers GED; elle est auditée par `stamp.deleted`.

Les refus ne sont pas insérés directement dans `audit_logs`. La politique centrale actuelle journalise les mutations abouties; ajouter un audit durable à une transaction volontairement rejetée demanderait une politique transverse distincte.

## 4. Export CSV financier

La route `GET /api/treasury/journal/export` réutilise `treasury.view`, les prédicats de scope du journal et ses filtres : compte, catégorie, sens, type de source, dates et référence. La requête ne contient ni `LIMIT`, ni `OFFSET` : toutes les lignes autorisées correspondant aux critères sont exportées, indépendamment de la page affichée.

Le fichier utilise le générateur financier commun :

- UTF-8 avec BOM;
- séparateur point-virgule;
- en-têtes français;
- dates `JJ/MM/AAAA`;
- montants numériques;
- libellés métier pour le sens, la source et le statut;
- neutralisation des cellules commençant par `=`, `+`, `-` ou `@` afin de prévenir l’injection de formule tableur.

L’export est audité par `treasury.journal.exported`. L’audit contient uniquement la section, les critères et le nombre de lignes, jamais le contenu financier exporté. L’interface place « Exporter en CSV » dans le Journal financier normalisé et transmet les filtres actifs.

## 5. Fichiers modifiés

- `backend-node/database/migrations/082_stamp_revocation.sql`
- `backend-node/src/app.ts`
- `backend-node/src/modules/document-marks/document-mark.routes.ts`
- `backend-node/src/modules/document-marks/stamp-lifecycle.routes.ts`
- `backend-node/src/modules/treasury/treasury.routes.ts`
- `backend-node/src/modules/treasury/treasury.service.ts`
- `backend-node/test/stamp-revocation-treasury-export.test.ts`
- `frontend/src/api/documentMarkHooks.ts`
- `frontend/src/modules/settings/DocumentMarksSettings.tsx`
- `frontend/src/modules/treasury/TreasuryPage.tsx`
- le présent rapport

## 6. Tests et résultats

| Contrôle | Résultat |
|---|---|
| Build TypeScript backend | PASS |
| Build Vite frontend | PASS, 2 490 modules transformés |
| Tests ciblés cachets/CSV | PASS |
| Tests de non-régression `document-marks-lot13` | PASS |
| Tests de non-régression `treasury-foundation` | PASS |
| `git diff --check` | PASS |
| MySQL 8.4 temporaire : application de 082 | PASS |
| Ligne de cachet préexistante conservée | PASS (1/1) |
| Colonnes, index, CHECK et FK | PASS |
| Révocation structurellement incomplète | REJETÉE par le CHECK, résultat attendu |
| Révocation complète valide | PASS |
| Suppression automatique de la base temporaire | PASS |

Le test MySQL a utilisé uniquement `lca_test_082`, créée puis supprimée dans le conteneur MySQL 8.4 existant. La base métier est restée à la migration 081. Le contrôle de lecture y relevait 2 cachets, 0 snapshot et 1 signature de livraison; aucune de ces lignes n’a été modifiée.

## 7. Intégrité et état de livraison

- Aucun conteneur n’a été reconstruit ou redémarré.
- Aucun volume n’a été supprimé ou réinitialisé.
- Aucune donnée métier actuelle n’a été modifiée.
- Aucun commit, push, tag, reset, restore, stash, clean ou changement de branche n’a été effectué.
- Archive officielle inchangée : `7a05ce52ace2033a5beb0b1f8ff967e346f4e63c8c0fe20bf29b91b0500ea3cc`.

## 8. Verdict

**FAVORABLE POUR INTÉGRATION CONTRÔLÉE.** Les évolutions sont compilées et qualifiées sur MySQL 8.4 isolé. Elles préservent les versions et documents historiques, bloquent les voies de réutilisation d’un cachet révoqué, contrôlent la suppression côté backend dans une transaction et exportent l’intégralité du journal autorisé avec protections CSV.

La migration 082 et le nouveau code ne sont pas appliqués à l’environnement Docker courant. Une reconstruction ou un redémarrage reste soumis à une autorisation séparée.
