# Résultats essentiels observés

- Sauvegarde gzip : intégrité réussie; restauration détachée code 0.
- Principal/restauration avant : 242 tables, 64 migrations, 264 étapes, 2 rôles, 383 permissions.
- Principal : 135 étapes 1–6 APPLIED; étape 7 FAILED_PARTIAL; zéro orphelin facture/client.
- Copie historique : reprise 135 étape 7 réussie, 135/136/137 APPLIED, niveau 137, zéro avertissement.
- Rejeu copie historique : niveau 137, zéro migration rejouée.
- Installation fraîche : baseline 071 puis migrations jusqu'à 137, code 0.
- Test ciblé runner MySQL 8.4 : 1 suite, 1 test agrégé, 0 échec; il contient cinq états structurels et onze assertions de FK/données.
- Contrôle immuabilité : 104 migrations vérifiées, zéro divergence 034–134, exception 135 conforme.
- Backend Node 22 : lint TypeScript réussi.
- Frontend Node 22 : lint réussi; build de qualification réussi dans `.artifacts/qualification-dist`.

Les totaux finaux des suites globales sont consignés dans `15-rapport-non-regression.md`.
