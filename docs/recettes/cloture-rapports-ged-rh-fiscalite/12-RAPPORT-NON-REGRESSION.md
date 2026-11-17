# Rapport de non-régression

- Backend : suite complète exécutée avec succès ; les tests MySQL optionnels restent explicitement ignorés hors activation, comme auparavant.
- Frontend : suite complète exécutée avec succès.
- Backend : `tsc --noEmit` et build verts.
- Frontend : `tsc --noEmit` et build Vite verts (2 549 modules transformés).
- Contrats ciblés backend : 32/32 après correction du test fiscal.
- Contrats ciblés frontend Fiscalité/RH : verts ; francisation RBAC corrigée puis revalidée.
# Rejeu final du 17 novembre 2026

Le frontend complet est vert : **1 052/1 052** tests, sans échec ni test ignoré. Le backend complet est vert : **2 117 réussis, 0 échec, 104 ignorés**, ces derniers étant les intégrations conditionnelles non activées par la commande générique. Les intégrations MySQL ciblées de cette mission ont été activées séparément et sont vertes. Les builds de production frontend et backend sont verts.

Les erreurs `EPERM` observées lors du premier lancement backend provenaient du bac à sable interdisant l’écoute locale ; ce lancement a été interrompu et n’est pas interprété comme une non-régression applicative.
