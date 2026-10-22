# Rapport de correction — Lot 1 Devis, Ventes et GED

## Verdict

Les deux parcours disposent désormais d'un état d'archive explicite et d'une reprise dédiée, idempotente et soumise aux permissions et scopes existants. Une panne post-commit de génération PDF/GED ne masque plus l'objet métier créé ou confirmé. Aucun schéma, aucune donnée métier, aucun environnement Docker et aucune archive de livraison n'ont été modifiés.

La correction du périmètre est validée par les tests ciblés, les lint et les builds. La suite backend globale demeure non verte à cause d'échecs déjà présents hors périmètre, détaillés plus bas ; ces échecs ne concernent pas l'archivage des devis ou des ventes.

## Cause racine

- L'émission d'un devis persistait correctement le numéro, le snapshot et l'état métier avant la génération du document officiel. Si cette dernière échouait, l'API répondait en erreur après le commit, puis l'interface conservait son ancien cache et ne proposait aucune reprise.
- La conversion en vente exigeait déjà l'archive officielle du devis. Le refus était donc légitime, mais son HTTP 409 générique ne permettait pas de comprendre ni de réparer l'état intermédiaire.
- La confirmation d'une vente suivait le même modèle post-commit : confirmation métier acquise, puis archivage du bon de commande. Une panne laissait une vente confirmée sans action de reprise visible.
- Le service GED était globalement idempotent, mais sa branche de collision concurrente pouvait rejouer le callback de marquage documentaire et produire un doublon logique de cachet.

## Correction réalisée

### Backend

- Les lectures devis et ventes exposent `archiveAvailable`, dérivé d'une recherche exacte du document GED officiel par `source_key`, ainsi que `archiveStatus` pour les devis.
- `POST /quotations/:id/archive` reprend uniquement l'archivage d'un devis déjà émis. La route exige `quotations.validate`, réutilise le scope de consultation/validation et ne rejoue ni l'émission, ni la numérotation, ni le snapshot.
- `POST /sales/:id/archive` reprend uniquement l'archivage d'une vente déjà confirmée. La route exige `sales.confirm`, conserve les scopes existants et ne rejoue ni la confirmation, ni les transitions du véhicule.
- Une conversion dont l'archive du devis manque retourne toujours HTTP 409, mais avec le code explicite `QUOTATION_ARCHIVE_REQUIRED`, l'identifiant du devis et une consigne de reprise.
- La collision concurrente GED réutilise le document gagnant sans rejouer le callback `afterInsertOnly`, empêchant la duplication d'un cachet/snapshot.
- Les tentatives manuelles de reprise sont journalisées séparément (`quotation.archive_retry_requested` et `sale.archive_retry_requested`). Les événements métier historiques ne sont pas rejoués.

### Frontend

- Les écrans CRM, liste des devis et détail de vente affichent l'état : `Archive disponible`, `Archive manquante`, `Archivage en cours` ou `Archivage en échec`.
- `Disponible` et `Manquante` sont des états persistants dérivés de la GED. `En cours` et `Échec` sont volontairement des états de la requête courante : aucune migration ni donnée fictive n'est introduite.
- L'action `Finaliser l'archivage` est affichée seulement sur un objet émis/confirmé sans archive et pour un utilisateur possédant la permission existante.
- L'impression et la conversion restent bloquées tant que l'archive officielle requise manque, avec un message explicite.
- Après une erreur post-commit, les caches devis/vente sont invalidés aussi en échec afin de refléter immédiatement l'état réellement persisté sans rechargement manuel.

## Sécurité, concurrence et intégrité

- Le backend reste l'autorité : cacher ou forger le bouton ne contourne ni permission ni scope.
- Les endpoints de reprise appellent le même générateur officiel et la même clé documentaire déterministe ; aucun second mécanisme PDF n'a été créé.
- Deux reprises concurrentes convergent vers un document et un fichier uniques.
- Les numéros, snapshots, statuts, historiques commerciaux, états véhicule et événements d'émission/confirmation ne sont pas dupliqués.
- Aucun document historique n'est remplacé ; un PDF déjà archivé reste relu tel quel.
- Aucune migration n'est nécessaire.

## Fichiers modifiés

- `backend-node/src/modules/documents/business-document.service.ts`
- `backend-node/src/modules/quotations/quotation.routes.ts`
- `backend-node/src/modules/quotations/quotation.service.ts`
- `backend-node/src/modules/sales/sale.routes.ts`
- `backend-node/src/modules/sales/sale.service.ts`
- `backend-node/test/archive-recovery-lot1.test.ts`
- `backend-node/test/commercial-residuals.test.ts`
- `frontend/src/api/erpHooks.ts`
- `frontend/src/modules/crm/CrmPage.tsx`
- `frontend/src/modules/sales/SaleDetailPage.tsx`
- `frontend/src/modules/sales/SalesListPage.tsx`
- `frontend/src/types/index.ts`
- `frontend/test/crm-negotiation-ui.behavior.test.ts`
- `docs/RAPPORT-AUDIT-REGRESSION-DEVIS-VENTES-PDF.md`
- `docs/RAPPORT-CORRECTION-LOT1-DEVIS-VENTES-GED.md`

## Tests réellement exécutés

### Résultats conformes

- Tests comportementaux backend dédiés au lot : panne du rendu, panne GED, reprise, concurrence, unicité, conservation des statuts/numéros et relecture des PDF historiques — **PASS**.
- `commercial-residuals.test.ts`, y compris le contrôle HTTP du scope de reprise devis — **17/17 PASS**.
- Tests d'immutabilité/archivage documentaire ciblés — **PASS**.
- Tests comportementaux CRM, y compris libellés, bouton de reprise et blocage impression/conversion — **9/9 PASS**.
- Suite frontend complète après mise à jour de l'assertion de contrat concernée — **977/977 PASS** (93,4 s).
- Lint backend — **PASS**.
- Build backend — **PASS**.
- Lint frontend — **PASS**.
- Build frontend — **PASS**.
- `git diff --check` — **PASS**.

### Suite globale backend

La campagne globale a été exécutée et se termine avec un code non nul. Les échecs observés sont hors du lot et existaient dans des contrats/fixtures non liés : validation de paramètres/agence, tri d'agence, ancien contrat de calcul de devis et assertion de délégation RBAC sur un scope `NULL`. Les tests du nouveau mécanisme d'archive et les scénarios commerciaux ciblés restent verts. Aucun de ces échecs n'a été masqué ou supprimé.

### Limites de validation

- Aucun test n'a été lancé sur la production, le VPS ou la base métier.
- Aucune recette MySQL réelle n'a été nécessaire : la correction ne modifie pas le schéma et les tests de concurrence ciblés utilisent des doubles comportementaux contrôlant les effets, pas une simple recherche de chaînes.
- La recette navigateur connectée à un environnement déployé reste à réaliser après une autorisation distincte de reconstruction/déploiement local ou distant.

## Risques résiduels et conditions de mise en service

- Avant livraison, rejouer la recette navigateur avec un compte disposant respectivement de `quotations.validate` et `sales.confirm`, puis avec un compte hors scope pour confirmer le masquage/refus réel.
- Simuler une indisponibilité du stockage GED uniquement dans un environnement isolé afin de vérifier visuellement les états `Échec` puis `Disponible` après reprise.
- Ne pas appliquer de migration : aucune n'est fournie ni requise par ce lot.
- Ne pas déployer tant que les échecs globaux hors périmètre n'ont pas été acceptés ou traités dans leurs lots respectifs.

## Conclusion

Le blocage fonctionnel P0 est corrigé : l'ERP distingue désormais explicitement l'état métier de l'état de son archive officielle, permet une finalisation sûre et idempotente, et conserve les barrières GED, RBAC et territoriales. Le lot peut être qualifié **VALIDÉ SUR SON PÉRIMÈTRE**, avec les réserves globales hors périmètre consignées ci-dessus.
