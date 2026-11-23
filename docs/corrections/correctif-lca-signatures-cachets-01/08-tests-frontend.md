# Tests frontend

- TypeScript/lint (`tsc --noEmit`) : réussi.
- Build Vite : réussi, 2 553 modules transformés, environ 24,8 s.
- Tests ciblés du correctif : **3 réussis, 0 échec, 0 ignoré**, 385 ms.
- Suite complète : exécutée ; échec hors périmètre `LOT14B2B-02`, qui attend le symbole historique `saveBusiness` dans le parent Settings. Cet échec ne concerne ni les fichiers ni les comportements modifiés par ce correctif.

Les tests ciblés couvrent mutation par document, indicateur local, messages contextualisés, invalidation des politiques et textes français. Une recette navigateur à deux sauvegardes réellement concurrentes reste recommandée.
