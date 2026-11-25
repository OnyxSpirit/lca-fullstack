# Non-régression

Backend build et lint réussis. Suite backend complète du 25/11/2026 : 365 tests, 337 réussis et 28 échoués ; les échecs concernent les réserves historiques hors RH/stock/contrats. Les tests `evolution-lca-03-finalization`, `fin04-remunerations`, `hr-contract-lot11a` et `hr-stock-ux02` sont verts.

Frontend TypeScript/lint réussi. Les quatre assertions finales LCA-03 sont vertes. Le build de qualification est vert dans Docker puis localement via le répertoire dédié `.artifacts/qualification-dist` (2 556 modules). La sortie standard `frontend/dist` reste détenue par l'UID d'un conteneur antérieur ; elle n'a pas été modifiée et n'est pas utilisée par cette qualification.

