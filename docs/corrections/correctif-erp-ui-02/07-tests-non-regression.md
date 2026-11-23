# Tests de non-régression

- Frontend : suite lancée hors sandbox après blocage IPC du lanceur TSX ; tests observés verts.
- Frontend TypeScript/lint : `tsc --noEmit` réussi.
- Frontend build : Vite réussi, 2 552 modules transformés.
- Backend : suite lancée ; assertions observées vertes, scénarios MySQL conditionnels ignorés faute de base dédiée.
- `git diff --check` : à exécuter en clôture.

La recette tactile Android/iOS et la persistance MySQL après actualisation/changement d’agence restent des contrôles manuels.
